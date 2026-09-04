import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RatingCpo } from "@/lib/types/database.types";
import { ACTIVE_RATINGS } from "@/lib/constants/rating";
import { getAssignableReps } from "@/lib/queries/reps";
import { formatDoctorName } from "@/lib/utils/name-normalization";

type Cycle = Database["public"]["Tables"]["cycles"]["Row"];
type Client = SupabaseClient<Database>;

export interface RatingDoctor {
  id: string;
  name: string;
}

export interface RepRatingMetrics {
  repId: string;
  repName: string;
  total: number;
  ratingCounts: Record<RatingCpo, number>;
  activeCount: number;
  activePct: number;
  rating0Count: number;
  rating0Pct: number;
  pendingCount: number;
  pendingPct: number;
  activeCoveragePct: number;
  doctorsByRating: Record<RatingCpo, RatingDoctor[]>;
}

function emptyCounts(): Record<RatingCpo, number> {
  return { "0": 0, "1": 0, "2": 0, "3": 0, ΥΔ: 0 };
}

function emptyDoctorLists(): Record<RatingCpo, RatingDoctor[]> {
  return { "0": [], "1": [], "2": [], "3": [], ΥΔ: [] };
}

export async function getRepRatingMetrics(
  supabase: Client,
  repId: string,
  repName: string,
  cycle: Cycle | null,
): Promise<RepRatingMetrics> {
  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, last_name, first_name, rating_cpo")
    .eq("current_rep_id", repId)
    .eq("status", "active")
    .is("institution", null)
    .order("last_name", { ascending: true });

  const rows = doctors ?? [];
  const total = rows.length;
  const ratingCounts = emptyCounts();
  const doctorsByRating = emptyDoctorLists();
  const activeIds = new Set<string>();
  for (const d of rows) {
    ratingCounts[d.rating_cpo] += 1;
    doctorsByRating[d.rating_cpo].push({ id: d.id, name: formatDoctorName(d.last_name, d.first_name) });
    if (ACTIVE_RATINGS.includes(d.rating_cpo)) activeIds.add(d.id);
  }
  const activeCount = activeIds.size;
  const rating0Count = ratingCounts["0"];
  const pendingCount = ratingCounts["ΥΔ"];

  let activeCoveragePct = 0;
  if (cycle && activeCount > 0) {
    const { data: visits } = await supabase
      .from("visits")
      .select("doctor_id")
      .eq("rep_id", repId)
      .eq("cycle_id", cycle.id)
      .eq("status", "completed");
    const visitedActive = new Set(
      (visits ?? [])
        .map((v) => v.doctor_id)
        .filter((id): id is string => !!id && activeIds.has(id)),
    );
    activeCoveragePct = (visitedActive.size / activeCount) * 100;
  }

  return {
    repId,
    repName,
    total,
    ratingCounts,
    activeCount,
    activePct: total > 0 ? (activeCount / total) * 100 : 0,
    rating0Count,
    rating0Pct: total > 0 ? (rating0Count / total) * 100 : 0,
    pendingCount,
    pendingPct: total > 0 ? (pendingCount / total) * 100 : 0,
    activeCoveragePct,
    doctorsByRating,
  };
}

export async function getAllRepsRatingMetrics(
  supabase: Client,
  cycle: Cycle | null,
): Promise<RepRatingMetrics[]> {
  const reps = await getAssignableReps(supabase);
  return Promise.all(
    reps.map((rep) => getRepRatingMetrics(supabase, rep.id, rep.full_name, cycle)),
  );
}

export interface CountyRatingMetrics {
  county: string;
  total: number;
  ratingCounts: Record<RatingCpo, number>;
  activeCount: number;
  activePct: number;
  rating0Count: number;
  rating0Pct: number;
  pendingCount: number;
  pendingPct: number;
  doctors: RatingDoctor[];
}

/** Ίδια στατιστικά αξιολόγησης με getAllRepsRatingMetrics, ομαδοποιημένα ανά Νομό αντί για rep. */
export async function getCountyRatingMetrics(supabase: Client): Promise<CountyRatingMetrics[]> {
  const { data } = await supabase
    .from("doctors")
    .select("id, last_name, first_name, county, rating_cpo")
    .eq("status", "active")
    .is("institution", null)
    .order("last_name", { ascending: true });

  const byCounty = new Map<
    string,
    { total: number; ratingCounts: Record<RatingCpo, number>; doctors: RatingDoctor[] }
  >();
  for (const d of data ?? []) {
    const county = d.county?.trim() || "Χωρίς νομό";
    const entry = byCounty.get(county) ?? { total: 0, ratingCounts: emptyCounts(), doctors: [] };
    entry.total++;
    entry.ratingCounts[d.rating_cpo]++;
    entry.doctors.push({ id: d.id, name: formatDoctorName(d.last_name, d.first_name) });
    byCounty.set(county, entry);
  }

  return [...byCounty.entries()]
    .map(([county, { total, ratingCounts, doctors }]) => {
      const activeCount = ACTIVE_RATINGS.reduce((s, r) => s + ratingCounts[r], 0);
      const rating0Count = ratingCounts["0"];
      const pendingCount = ratingCounts["ΥΔ"];
      return {
        county,
        total,
        ratingCounts,
        activeCount,
        activePct: total > 0 ? (activeCount / total) * 100 : 0,
        rating0Count,
        rating0Pct: total > 0 ? (rating0Count / total) * 100 : 0,
        pendingCount,
        pendingPct: total > 0 ? (pendingCount / total) * 100 : 0,
        doctors,
      };
    })
    .sort((a, b) => b.total - a.total);
}
