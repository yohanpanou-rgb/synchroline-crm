import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import {
  getActiveCycle,
  getRepMetrics,
  getAllRepsMetrics,
  type RepMetrics,
} from "@/lib/queries/dashboard";
import {
  getRepRatingMetrics,
  getAllRepsRatingMetrics,
  getCountyRatingMetrics,
  type RepRatingMetrics,
} from "@/lib/queries/rating";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PacingBar } from "@/components/dashboard/PacingBar";
import { RatingStackedBar } from "@/components/dashboard/RatingStackedBar";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { RegionBreakdownList } from "@/components/dashboard/RegionBreakdownList";
import { Button } from "@/components/ui/Button";
import {
  getWeekPharmacyVisitCount,
  getAllRepsPharmacyMetrics,
  getCyclePharmacyVisitCount,
  getAllRepsCyclePharmacyMetrics,
} from "@/lib/queries/pharmacies";
import { getVisitTrend, getRegionBreakdown } from "@/lib/queries/trends";
import {
  getRepPrescriptionMetrics,
  getAllRepsPrescriptionMetrics,
  getOverallSubBrandStats,
} from "@/lib/queries/prescriptions";
import { SubBrandBarChart } from "@/components/dashboard/SubBrandBarChart";
import { getInstitutionVisitStats } from "@/lib/queries/institutions";
import { computePacing } from "@/lib/utils/pacing";

const SYGGROS_INSTITUTION = "ΣΥΓΓΡΟΣ";

function SyggrosReportCard({
  stats,
  cycleName,
}: {
  stats: Awaited<ReturnType<typeof getInstitutionVisitStats>>;
  cycleName: string | undefined;
}) {
  return (
    <Card className="mt-6">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Σύγγρος{cycleName ? ` — ${cycleName}` : ""}</CardTitle>
        <Link href="/hospitals" className="text-xs font-medium text-primary hover:underline">
          Λίστα γιατρών
        </Link>
      </CardHeader>
      <p className="mb-2 text-sm text-ink">
        {stats.visitsThisCycle} επισκέψεις σε {stats.doctorCount} γιατρούς
      </p>
      {stats.byRep.length > 0 && (
        <div className="space-y-1">
          {stats.byRep.map((r) => (
            <div key={r.repId} className="flex justify-between text-xs text-ink/60">
              <span>{r.repName}</span>
              <span className="tabular-nums">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
import { getAssignableReps } from "@/lib/queries/reps";
import { WEEKLY_PHARMACY_VISIT_TARGET } from "@/lib/constants/schedule";
import { RATING_CPO_ALERT_THRESHOLD_PCT } from "@/lib/constants/rating";
import { cn } from "@/lib/utils/cn";

type RatingSortKey = "pendingPct" | "activePct" | "rating0Pct" | "repName";

const RATING_SORT_LABEL: Record<RatingSortKey, string> = {
  repName: "Rep",
  activePct: "Ενεργοί %",
  rating0Pct: "Χωρίς επίσκεψη %",
  pendingPct: "ΥΔ %",
};

function sortRatingMetrics(
  metrics: RepRatingMetrics[],
  sortKey: RatingSortKey,
): RepRatingMetrics[] {
  const sorted = [...metrics];
  if (sortKey === "repName") {
    sorted.sort((a, b) => a.repName.localeCompare(b.repName, "el"));
  } else {
    sorted.sort((a, b) => b[sortKey] - a[sortKey]);
  }
  return sorted;
}

function RatingSortHeader({
  sortKey,
  activeSortKey,
}: {
  sortKey: RatingSortKey;
  activeSortKey: RatingSortKey;
}) {
  return (
    <Link
      href={`/dashboard?ratingSort=${sortKey}#rating`}
      className={cn(
        "hover:text-primary",
        sortKey === activeSortKey && "font-semibold text-primary-dark",
      )}
    >
      {RATING_SORT_LABEL[sortKey]}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-medium text-ink/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-primary-dark">
        {value}
      </p>
    </Card>
  );
}

function RepRow({ metrics }: { metrics: RepMetrics }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {metrics.repName}
        </p>
        <p className="text-xs text-ink/50">
          {metrics.coveredCount}/{metrics.territorySize} γιατροί ·{" "}
          {metrics.visitsCompleted} επισκέψεις
        </p>
      </div>
      <Badge
        tone={
          metrics.coveragePct >= metrics.targetCoveragePct
            ? "success"
            : metrics.coveragePct >= metrics.targetCoveragePct * 0.8
              ? "warning"
              : "danger"
        }
      >
        {metrics.coveragePct.toFixed(0)}% / στόχος {metrics.targetCoveragePct.toFixed(0)}%
      </Badge>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ratingSort?: string }>;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const cycle = await getActiveCycle(supabase);
  const { ratingSort } = await searchParams;
  const ratingSortKey: RatingSortKey =
    ratingSort && ratingSort in RATING_SORT_LABEL
      ? (ratingSort as RatingSortKey)
      : "pendingPct";

  if (isManagerOrAdmin(profile.role)) {
    const repsMetrics = await getAllRepsMetrics(supabase, cycle);
    const totalDoctors = repsMetrics.reduce((s, r) => s + r.territorySize, 0);
    const totalVisits = repsMetrics.reduce((s, r) => s + r.visitsCompleted, 0);
    const avgCoverage =
      repsMetrics.length > 0
        ? repsMetrics.reduce((s, r) => s + r.coveragePct, 0) / repsMetrics.length
        : 0;
    const reps = await getAssignableReps(supabase);
    const pharmacyMetrics = await getAllRepsPharmacyMetrics(supabase, reps);
    const pharmacyCycleMetrics = cycle
      ? await getAllRepsCyclePharmacyMetrics(supabase, reps, cycle)
      : [];
    const visitTrend = await getVisitTrend(supabase, cycle);
    const regionBreakdown = await getRegionBreakdown(supabase, cycle);
    const teamPacing = cycle
      ? computePacing({
          cycleStartDate: cycle.start_date,
          cycleEndDate: cycle.end_date,
          actualCoveragePct: avgCoverage,
          targetCoveragePct:
            repsMetrics.length > 0
              ? repsMetrics.reduce((s, r) => s + r.targetCoveragePct, 0) / repsMetrics.length
              : 0,
        })
      : null;
    const ratingMetricsRaw = await getAllRepsRatingMetrics(supabase, cycle);
    const ratingMetrics = sortRatingMetrics(ratingMetricsRaw, ratingSortKey);
    const countyRatingMetrics = await getCountyRatingMetrics(supabase);
    const prescriptionMetrics = await getAllRepsPrescriptionMetrics(supabase);
    const overallSubBrandStats = await getOverallSubBrandStats(supabase);
    const syggrosStats = await getInstitutionVisitStats(supabase, SYGGROS_INSTITUTION, cycle);
    const ratingTotals = ratingMetricsRaw.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.activeCount += r.activeCount;
        acc.rating0Count += r.rating0Count;
        acc.pendingCount += r.pendingCount;
        (["0", "1", "2", "3", "ΥΔ"] as const).forEach((k) => {
          acc.ratingCounts[k] += r.ratingCounts[k];
        });
        return acc;
      },
      {
        total: 0,
        activeCount: 0,
        rating0Count: 0,
        pendingCount: 0,
        ratingCounts: { "0": 0, "1": 0, "2": 0, "3": 0, ΥΔ: 0 },
      },
    );

    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-primary-dark">
            Dashboard — Ομάδα
          </h1>
          <Link href="/doctors/new">
            <Button size="md">+ Νέος γιατρός</Button>
          </Link>
        </div>
        <p className="mb-6 text-sm text-ink/50">
          {cycle ? cycle.name : "Δεν υπάρχει ενεργός κύκλος"}
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="Σύνολο γιατρών" value={String(totalDoctors)} />
          <StatCard
            label="Ολοκληρωμένες επισκέψεις"
            value={String(totalVisits)}
          />
          <StatCard label="Μ.Ο. κάλυψης" value={`${avgCoverage.toFixed(0)}%`} />
        </div>

        {teamPacing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pacing κύκλου — Ομάδα</CardTitle>
            </CardHeader>
            <PacingBar
              label="Μ.Ο. κάλυψη ομάδας"
              subtitle={`${avgCoverage.toFixed(0)}% κάλυψη στο ${teamPacing.cycleProgressPct.toFixed(0)}% του χρόνου του κύκλου`}
              cycleStartDate={cycle!.start_date}
              cycleEndDate={cycle!.end_date}
              actualCoveragePct={avgCoverage}
              targetCoveragePct={teamPacing.targetCoveragePct}
            />
          </Card>
        )}

        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Τάση επισκέψεων</CardTitle>
            </CardHeader>
            <TrendChart buckets={visitTrend} />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Γεωγραφική κατανομή</CardTitle>
            </CardHeader>
            <RegionBreakdownList regions={regionBreakdown} />
          </Card>
        </div>

        {repsMetrics.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Κατάταξη reps — κάλυψη κύκλου</CardTitle>
            </CardHeader>
            <div className="divide-y divide-black/5">
              {[...repsMetrics]
                .sort((a, b) => b.coveragePct - a.coveragePct)
                .map((m, i) => (
                  <div key={m.repId} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-warning/20 text-warning"
                            : i === 1
                              ? "bg-ink/10 text-ink/60"
                              : i === 2
                                ? "bg-danger/10 text-danger"
                                : "bg-ink/5 text-ink/40"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-ink">{m.repName}</span>
                    </div>
                    <span className="tabular-nums text-sm text-ink/60">
                      {m.coveragePct.toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Κάλυψη ανά rep</CardTitle>
          </CardHeader>
          <div className="divide-y divide-black/5">
            {repsMetrics.length === 0 && (
              <p className="py-4 text-sm text-ink/50">Δεν υπάρχουν reps.</p>
            )}
            {repsMetrics.map((m) => (
              <RepRow key={m.repId} metrics={m} />
            ))}
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>
              Φαρμακεία — εβδομαδιαία πρόοδος (στόχος {WEEKLY_PHARMACY_VISIT_TARGET}/rep)
            </CardTitle>
            <Link href="/pharmacies" className="text-xs font-medium text-primary hover:underline">
              Ιστορικό
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {pharmacyMetrics.length === 0 && (
              <p className="py-4 text-sm text-ink/50">Δεν υπάρχουν reps.</p>
            )}
            {pharmacyMetrics.map((m) => {
              const cycleCount = pharmacyCycleMetrics.find((c) => c.repId === m.repId)?.count ?? 0;
              return (
                <div key={m.repId}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-ink">{m.repName}</span>
                    <span className="tabular-nums text-ink/50">
                      {m.count}/{WEEKLY_PHARMACY_VISIT_TARGET} εβδομάδα · {cycleCount} στον κύκλο
                    </span>
                  </div>
                  <ProgressBar
                    value={(m.count / WEEKLY_PHARMACY_VISIT_TARGET) * 100}
                    colorClassName={
                      m.count >= WEEKLY_PHARMACY_VISIT_TARGET ? "bg-success" : "bg-primary"
                    }
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="mt-6" id="rating">
          <CardHeader>
            <CardTitle>Αξιολόγηση Πελατολογίου</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                  <th className="py-2 pr-3 font-medium">
                    <RatingSortHeader sortKey="repName" activeSortKey={ratingSortKey} />
                  </th>
                  <th className="py-2 pr-3 font-medium">Σύνολο</th>
                  <th className="py-2 pr-3 font-medium">
                    <RatingSortHeader sortKey="activePct" activeSortKey={ratingSortKey} />
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    <RatingSortHeader sortKey="pendingPct" activeSortKey={ratingSortKey} />
                  </th>
                  <th className="py-2 pr-3 font-medium">Κατανομή 1/2/3/0/ΥΔ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {ratingMetrics.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-sm text-ink/50">
                      Δεν υπάρχουν reps.
                    </td>
                  </tr>
                )}
                {ratingMetrics.map((m) => (
                  <tr key={m.repId}>
                    <td className="py-2.5 pr-3 font-medium text-ink">{m.repName}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink/70">{m.total}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink/70">
                      {m.activeCount} ({m.activePct.toFixed(0)}%)
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge
                        tone={
                          m.pendingPct > RATING_CPO_ALERT_THRESHOLD_PCT
                            ? "danger"
                            : "neutral"
                        }
                      >
                        {m.pendingCount} ({m.pendingPct.toFixed(0)}%)
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="w-32">
                        <RatingStackedBar counts={m.ratingCounts} total={m.total} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {ratingMetrics.length > 0 && (
                <tfoot>
                  <tr className="border-t border-black/10 font-semibold text-ink">
                    <td className="py-2.5 pr-3">Σύνολο</td>
                    <td className="py-2.5 pr-3 tabular-nums">{ratingTotals.total}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {ratingTotals.activeCount} (
                      {ratingTotals.total > 0
                        ? ((ratingTotals.activeCount / ratingTotals.total) * 100).toFixed(0)
                        : 0}
                      %)
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {ratingTotals.pendingCount} (
                      {ratingTotals.total > 0
                        ? ((ratingTotals.pendingCount / ratingTotals.total) * 100).toFixed(0)
                        : 0}
                      %)
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="w-32">
                        <RatingStackedBar
                          counts={ratingTotals.ratingCounts}
                          total={ratingTotals.total}
                        />
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        <CollapsibleCard title="Αξιολόγηση Πελατολογίου ανά Νομό" defaultOpen={false} className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                  <th className="py-2 pr-3 font-medium">Νομός</th>
                  <th className="py-2 pr-3 font-medium">Σύνολο</th>
                  <th className="py-2 pr-3 font-medium">Ενεργοί %</th>
                  <th className="py-2 pr-3 font-medium">ΥΔ %</th>
                  <th className="py-2 pr-3 font-medium">Κατανομή 1/2/3/0/ΥΔ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {countyRatingMetrics.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-sm text-ink/50">
                      Δεν υπάρχουν δεδομένα.
                    </td>
                  </tr>
                )}
                {countyRatingMetrics.map((m) => (
                  <tr key={m.county}>
                    <td className="py-2.5 pr-3 font-medium text-ink">{m.county}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink/70">{m.total}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink/70">
                      {m.activeCount} ({m.activePct.toFixed(0)}%)
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge
                        tone={m.pendingPct > RATING_CPO_ALERT_THRESHOLD_PCT ? "danger" : "neutral"}
                      >
                        {m.pendingCount} ({m.pendingPct.toFixed(0)}%)
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="w-32">
                        <RatingStackedBar counts={m.ratingCounts} total={m.total} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Συνταγογράφηση ανά Sub-brand</CardTitle>
          </CardHeader>
          <p className="mb-3 text-xs text-ink/50">Σύγκριση μέσου όρου/εβδομάδα (όλοι οι reps)</p>
          <SubBrandBarChart stats={overallSubBrandStats} />

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                  <th className="py-2 pr-3 font-medium">Rep</th>
                  <th className="py-2 pr-3 font-medium">Aknicare</th>
                  <th className="py-2 pr-3 font-medium">Closebax</th>
                  <th className="py-2 pr-3 font-medium">Terproline</th>
                  <th className="py-2 pr-3 font-medium">Rosacure</th>
                  <th className="py-2 pr-3 font-medium">Κάλυψη</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {prescriptionMetrics.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-sm text-ink/50">
                      Δεν υπάρχουν reps.
                    </td>
                  </tr>
                )}
                {prescriptionMetrics.map((m) => (
                  <tr key={m.repId}>
                    <td className="py-2.5 pr-3 font-medium text-ink">{m.repName}</td>
                    {m.bySubBrand.map((b) => (
                      <td key={b.brand} className="py-2.5 pr-3 tabular-nums text-ink/70">
                        {b.average !== null ? b.average.toFixed(1) : "—"}
                      </td>
                    ))}
                    <td className="py-2.5 pr-3 tabular-nums text-ink/70">
                      {m.coverageCount}/{m.totalActive} ({m.coveragePct.toFixed(0)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <SyggrosReportCard stats={syggrosStats} cycleName={cycle?.name} />
      </div>
    );
  }

  const metrics = await getRepMetrics(supabase, profile.id, profile.full_name, cycle);
  const ratingMetrics = await getRepRatingMetrics(
    supabase,
    profile.id,
    profile.full_name,
    cycle,
  );
  const pharmacyCount = await getWeekPharmacyVisitCount(supabase, profile.id);
  const pharmacyCycleCount = cycle
    ? await getCyclePharmacyVisitCount(supabase, profile.id, cycle)
    : 0;
  const visitTrend = await getVisitTrend(supabase, cycle, profile.id);
  const regionBreakdown = await getRegionBreakdown(supabase, cycle, profile.id);
  const prescriptionMetrics = await getRepPrescriptionMetrics(supabase, profile.id, profile.full_name);
  const syggrosStats = await getInstitutionVisitStats(supabase, SYGGROS_INSTITUTION, cycle);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-primary-dark">
          Καλησπέρα, {profile.full_name.split(" ")[0]}
        </h1>
        <Link href="/doctors/new">
          <Button size="md">+ Νέος γιατρός</Button>
        </Link>
      </div>
      <p className="mb-6 text-sm text-ink/50">
        {cycle ? cycle.name : "Δεν υπάρχει ενεργός κύκλος"}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          label="Γιατροί πελατολογίου (1+2+3)"
          value={String(ratingMetrics.activeCount)}
        />
        <StatCard
          label="Ολοκληρωμένες επισκέψεις"
          value={String(metrics.visitsCompleted)}
        />
        <StatCard
          label="Προγραμματισμένες"
          value={String(metrics.visitsPlanned)}
        />
        <StatCard label="Στόχος επισκέψεων" value={String(metrics.targetVisits)} />
        <StatCard
          label="Χωρίς επίσκεψη (0)"
          value={String(ratingMetrics.rating0Count)}
        />
        <StatCard
          label="Υπό διερεύνηση (ΥΔ)"
          value={String(ratingMetrics.pendingCount)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pacing κύκλου</CardTitle>
        </CardHeader>
        {cycle ? (
          <PacingBar
            label="Κάλυψη πελατολογίου"
            subtitle={`${metrics.coveredCount} / ${metrics.territorySize} γιατροί`}
            cycleStartDate={cycle.start_date}
            cycleEndDate={cycle.end_date}
            actualCoveragePct={metrics.coveragePct}
            targetCoveragePct={metrics.targetCoveragePct}
          />
        ) : (
          <p className="text-sm text-ink/50">
            Δεν έχει οριστεί ενεργός κύκλος από τον admin.
          </p>
        )}
      </Card>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Τάση επισκέψεων</CardTitle>
          </CardHeader>
          <TrendChart buckets={visitTrend} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Γεωγραφική κατανομή</CardTitle>
          </CardHeader>
          <RegionBreakdownList regions={regionBreakdown} />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Αξιολόγηση Πελατολογίου</CardTitle>
        </CardHeader>
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-ink/50">Ενεργοί (1+2+3)</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary-dark">
              {ratingMetrics.activeCount}
              <span className="ml-1 text-xs font-normal text-ink/50">
                {ratingMetrics.activePct.toFixed(0)}%
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-ink/50">Χωρίς επίσκεψη</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
              {ratingMetrics.rating0Count}
              <span className="ml-1 text-xs font-normal text-ink/50">
                {ratingMetrics.rating0Pct.toFixed(0)}%
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-ink/50">Υπό διερεύνηση (ΥΔ)</p>
            <p
              className={cn(
                "mt-0.5 text-lg font-semibold tabular-nums",
                ratingMetrics.pendingPct > RATING_CPO_ALERT_THRESHOLD_PCT
                  ? "text-danger"
                  : "text-ink",
              )}
            >
              {ratingMetrics.pendingCount}
              <span className="ml-1 text-xs font-normal text-ink/50">
                {ratingMetrics.pendingPct.toFixed(0)}%
              </span>
            </p>
          </div>
        </div>
        {ratingMetrics.pendingPct > RATING_CPO_ALERT_THRESHOLD_PCT && (
          <Badge tone="danger" className="mb-4">
            Πάνω από {RATING_CPO_ALERT_THRESHOLD_PCT}% του πελατολογίου είναι
            «Υπό διερεύνηση»
          </Badge>
        )}
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-ink/50">Κάλυψη ενεργών γιατρών στον κύκλο</span>
            <span className="tabular-nums font-medium text-ink">
              {ratingMetrics.activeCoveragePct.toFixed(0)}%
            </span>
          </div>
          <ProgressBar
            value={ratingMetrics.activeCoveragePct}
            colorClassName="bg-primary"
          />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Συνταγογράφηση ανά Sub-brand</CardTitle>
        </CardHeader>
        <p className="mb-3 text-xs text-ink/50">
          Κάλυψη: {prescriptionMetrics.coverageCount}/{prescriptionMetrics.totalActive} γιατρών (
          {prescriptionMetrics.coveragePct.toFixed(0)}%)
        </p>
        <SubBrandBarChart stats={prescriptionMetrics.bySubBrand} />
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Φαρμακεία</CardTitle>
          <Link href="/pharmacies" className="text-xs font-medium text-primary hover:underline">
            Ιστορικό
          </Link>
        </CardHeader>
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-ink/50">Αυτή την εβδομάδα</span>
          <span className="tabular-nums font-medium text-ink">
            {pharmacyCount}/{WEEKLY_PHARMACY_VISIT_TARGET}
          </span>
        </div>
        <ProgressBar
          value={(pharmacyCount / WEEKLY_PHARMACY_VISIT_TARGET) * 100}
          colorClassName={
            pharmacyCount >= WEEKLY_PHARMACY_VISIT_TARGET ? "bg-success" : "bg-primary"
          }
        />
        {cycle && (
          <p className="mt-2 text-xs text-ink/50">
            {pharmacyCycleCount} επισκέψεις στον κύκλο «{cycle.name}»
          </p>
        )}
      </Card>

      <SyggrosReportCard stats={syggrosStats} cycleName={cycle?.name} />
    </div>
  );
}
