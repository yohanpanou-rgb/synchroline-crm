import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getAssignableReps } from "@/lib/queries/reps";

type Client = SupabaseClient<Database>;

const BRANDS = [
  { key: "aknicare", label: "Aknicare" },
  { key: "closebax", label: "Closebax" },
  { key: "terproline", label: "Terproline" },
  { key: "rosacure", label: "Rosacure" },
] as const;

type BrandKey = (typeof BRANDS)[number]["key"];

export interface SubBrandStats {
  brand: BrandKey;
  label: string;
  average: number | null;
  count: number;
}

export interface PrescriptionMetrics {
  repId: string;
  repName: string;
  totalActive: number;
  coverageCount: number;
  coveragePct: number;
  bySubBrand: SubBrandStats[];
}

/** "5-10" -> 7.5 (μέσος όρος εύρους), "8" -> 8, μη έγκυρο -> null. */
export function parseTerprolineValue(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return (parseFloat(rangeMatch[1]!) + parseFloat(rangeMatch[2]!)) / 2;
  }
  const num = parseFloat(trimmed);
  return Number.isNaN(num) ? null : num;
}

interface DoctorRxRow {
  weekly_rx_aknicare: number | null;
  weekly_rx_closebax: number | null;
  weekly_rx_terproline: string | null;
  weekly_rx_rosacure: number | null;
}

function aggregate(rows: DoctorRxRow[]) {
  const sums: Record<BrandKey, number> = { aknicare: 0, closebax: 0, terproline: 0, rosacure: 0 };
  const counts: Record<BrandKey, number> = { aknicare: 0, closebax: 0, terproline: 0, rosacure: 0 };
  let coverageCount = 0;

  for (const r of rows) {
    const values: Record<BrandKey, number | null> = {
      aknicare: r.weekly_rx_aknicare,
      closebax: r.weekly_rx_closebax,
      terproline: parseTerprolineValue(r.weekly_rx_terproline),
      rosacure: r.weekly_rx_rosacure,
    };
    if (Object.values(values).some((v) => v !== null)) coverageCount++;
    for (const brand of BRANDS) {
      const v = values[brand.key];
      if (v !== null) {
        sums[brand.key] += v;
        counts[brand.key]++;
      }
    }
  }

  const bySubBrand: SubBrandStats[] = BRANDS.map((b) => ({
    brand: b.key,
    label: b.label,
    average: counts[b.key] > 0 ? sums[b.key] / counts[b.key] : null,
    count: counts[b.key],
  }));

  return { coverageCount, bySubBrand };
}

async function fetchActiveDoctorRx(supabase: Client, repId?: string): Promise<DoctorRxRow[]> {
  let query = supabase
    .from("doctors")
    .select("weekly_rx_aknicare, weekly_rx_closebax, weekly_rx_terproline, weekly_rx_rosacure")
    .eq("status", "active");
  if (repId) query = query.eq("current_rep_id", repId);
  const { data } = await query;
  return data ?? [];
}

export async function getRepPrescriptionMetrics(
  supabase: Client,
  repId: string,
  repName: string,
): Promise<PrescriptionMetrics> {
  const rows = await fetchActiveDoctorRx(supabase, repId);
  const { coverageCount, bySubBrand } = aggregate(rows);
  return {
    repId,
    repName,
    totalActive: rows.length,
    coverageCount,
    coveragePct: rows.length > 0 ? (coverageCount / rows.length) * 100 : 0,
    bySubBrand,
  };
}

export async function getAllRepsPrescriptionMetrics(supabase: Client): Promise<PrescriptionMetrics[]> {
  const reps = await getAssignableReps(supabase);
  return Promise.all(reps.map((r) => getRepPrescriptionMetrics(supabase, r.id, r.full_name)));
}

/** Σύνολο όλων των ενεργών γιατρών (όχι ανά rep) — για το bar chart σύγκρισης sub-brands. */
export async function getOverallSubBrandStats(supabase: Client): Promise<SubBrandStats[]> {
  const rows = await fetchActiveDoctorRx(supabase);
  return aggregate(rows).bySubBrand;
}
