import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getAssignableReps } from "@/lib/queries/reps";
import { getActiveCycle, getRepMetrics } from "@/lib/queries/dashboard";
import { getWeekPharmacyVisitCount } from "@/lib/queries/pharmacies";
import {
  startOfWeek,
  addDays,
  toISODate,
  formatDateGR,
  WEEKLY_PHARMACY_VISIT_TARGET,
} from "@/lib/constants/schedule";

type Client = SupabaseClient<Database>;

const FLAG_THRESHOLD_PCT = 20;

export interface RepWeeklyRow {
  repName: string;
  visitsThisWeek: number;
  visitsLastWeek: number;
  visitsPctChange: number | null;
  pharmacyThisWeek: number;
  pharmacyLastWeek: number;
  pharmacyPctChange: number | null;
  coveragePct: number;
  targetCoveragePct: number;
  targetVisits: number;
  cycleVisitsCompleted: number;
}

export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  cycleName: string | null;
  reps: RepWeeklyRow[];
  totals: {
    visitsThisWeek: number;
    visitsLastWeek: number;
    pharmacyThisWeek: number;
    pharmacyLastWeek: number;
  };
  flags: string[];
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function countCompletedVisits(
  supabase: Client,
  repId: string,
  startISO: string,
  endISO: string,
): Promise<number> {
  const { count } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("rep_id", repId)
    .eq("status", "completed")
    .gte("completed_date", startISO)
    .lte("completed_date", endISO);
  return count ?? 0;
}

export async function getWeeklyReportData(
  supabase: Client,
  anchor: Date = new Date(),
): Promise<WeeklyReportData> {
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 4);
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekEnd, -7);

  const reps = await getAssignableReps(supabase);
  const cycle = await getActiveCycle(supabase);

  const rows: RepWeeklyRow[] = await Promise.all(
    reps.map(async (rep) => {
      const [visitsThisWeek, visitsLastWeek, pharmacyThisWeek, pharmacyLastWeek, cycleMetrics] =
        await Promise.all([
          countCompletedVisits(supabase, rep.id, toISODate(weekStart), toISODate(weekEnd)),
          countCompletedVisits(supabase, rep.id, toISODate(lastWeekStart), toISODate(lastWeekEnd)),
          getWeekPharmacyVisitCount(supabase, rep.id, anchor),
          getWeekPharmacyVisitCount(supabase, rep.id, addDays(anchor, -7)),
          getRepMetrics(supabase, rep.id, rep.full_name, cycle),
        ]);

      return {
        repName: rep.full_name,
        visitsThisWeek,
        visitsLastWeek,
        visitsPctChange: pctChange(visitsThisWeek, visitsLastWeek),
        pharmacyThisWeek,
        pharmacyLastWeek,
        pharmacyPctChange: pctChange(pharmacyThisWeek, pharmacyLastWeek),
        coveragePct: cycleMetrics.coveragePct,
        targetCoveragePct: cycleMetrics.targetCoveragePct,
        targetVisits: cycleMetrics.targetVisits,
        cycleVisitsCompleted: cycleMetrics.visitsCompleted,
      };
    }),
  );

  const totals = rows.reduce(
    (acc, r) => ({
      visitsThisWeek: acc.visitsThisWeek + r.visitsThisWeek,
      visitsLastWeek: acc.visitsLastWeek + r.visitsLastWeek,
      pharmacyThisWeek: acc.pharmacyThisWeek + r.pharmacyThisWeek,
      pharmacyLastWeek: acc.pharmacyLastWeek + r.pharmacyLastWeek,
    }),
    { visitsThisWeek: 0, visitsLastWeek: 0, pharmacyThisWeek: 0, pharmacyLastWeek: 0 },
  );

  const flags: string[] = [];
  for (const r of rows) {
    if (r.visitsPctChange !== null && Math.abs(r.visitsPctChange) >= FLAG_THRESHOLD_PCT) {
      const direction = r.visitsPctChange > 0 ? "αύξηση" : "μείωση";
      flags.push(
        `${r.repName}: ${direction} επισκέψεων ${Math.abs(r.visitsPctChange)}% (${r.visitsLastWeek} → ${r.visitsThisWeek})`,
      );
    }
    if (r.pharmacyPctChange !== null && Math.abs(r.pharmacyPctChange) >= FLAG_THRESHOLD_PCT) {
      const direction = r.pharmacyPctChange > 0 ? "αύξηση" : "μείωση";
      flags.push(
        `${r.repName}: ${direction} επισκέψεων φαρμακείων ${Math.abs(r.pharmacyPctChange)}% (${r.pharmacyLastWeek} → ${r.pharmacyThisWeek})`,
      );
    }
    if (r.coveragePct < r.targetCoveragePct * 0.8) {
      flags.push(
        `${r.repName}: κάλυψη πελατολογίου ${r.coveragePct.toFixed(0)}% — αρκετά κάτω από τον στόχο ${r.targetCoveragePct.toFixed(0)}%`,
      );
    }
  }
  if (flags.length === 0) {
    flags.push("Καμία σημαντική μεταβολή (>20%) σε σχέση με την προηγούμενη εβδομάδα.");
  }

  return {
    weekStart: formatDateGR(weekStart),
    weekEnd: formatDateGR(weekEnd),
    cycleName: cycle?.name ?? null,
    reps: rows,
    totals,
    flags,
  };
}

export { WEEKLY_PHARMACY_VISIT_TARGET };
