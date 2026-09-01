import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { startOfWeek, addDays, toISODate } from "@/lib/constants/schedule";

type Client = SupabaseClient<Database>;
type Cycle = Database["public"]["Tables"]["cycles"]["Row"];

export interface WeekBucket {
  label: string;
  weekStart: string;
  count: number;
}

const MAX_WEEKS = 8;

/**
 * Weekly completed-visit counts. Buckets span the active cycle (capped at
 * MAX_WEEKS, most recent weeks kept) when one exists, otherwise the last
 * MAX_WEEKS weeks up to today.
 */
export async function getVisitTrend(
  supabase: Client,
  cycle: Cycle | null,
  repId?: string,
): Promise<WeekBucket[]> {
  const today = new Date();
  const rangeStart = cycle ? new Date(cycle.start_date) : addDays(startOfWeek(today), -7 * (MAX_WEEKS - 1));
  const rangeEnd = cycle ? new Date(cycle.end_date) : today;

  let bucketStarts: Date[] = [];
  for (let d = startOfWeek(rangeStart); d <= rangeEnd; d = addDays(d, 7)) {
    bucketStarts.push(d);
  }
  if (bucketStarts.length > MAX_WEEKS) {
    bucketStarts = bucketStarts.slice(-MAX_WEEKS);
  }
  if (bucketStarts.length === 0) return [];

  const queryStart = toISODate(bucketStarts[0]!);
  const queryEnd = toISODate(addDays(bucketStarts[bucketStarts.length - 1]!, 6));

  let query = supabase
    .from("visits")
    .select("completed_date, scheduled_date")
    .eq("status", "completed")
    .gte("completed_date", queryStart)
    .lte("completed_date", queryEnd);
  if (repId) query = query.eq("rep_id", repId);

  const { data } = await query;

  const buckets = bucketStarts.map((weekStart) => ({
    label: `${String(weekStart.getDate()).padStart(2, "0")}/${String(weekStart.getMonth() + 1).padStart(2, "0")}`,
    weekStart: toISODate(weekStart),
    count: 0,
  }));

  for (const visit of data ?? []) {
    const dateStr = visit.completed_date ?? visit.scheduled_date;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (date >= new Date(buckets[i]!.weekStart)) {
        buckets[i]!.count++;
        break;
      }
    }
  }

  return buckets;
}

export interface RegionBreakdown {
  region: string;
  doctorCount: number;
  visitsThisCycle: number;
}

/** Doctor + completed-visit counts grouped by region, sorted by doctor count desc. */
export async function getRegionBreakdown(
  supabase: Client,
  cycle: Cycle | null,
  repId?: string,
): Promise<RegionBreakdown[]> {
  let doctorsQuery = supabase
    .from("doctors")
    .select("id, region")
    .eq("status", "active");
  if (repId) doctorsQuery = doctorsQuery.eq("current_rep_id", repId);
  const { data: doctors } = await doctorsQuery;

  const regionByDoctorId = new Map<string, string>();
  const doctorCountByRegion = new Map<string, number>();
  for (const d of doctors ?? []) {
    const region = d.region?.trim() || "Χωρίς περιοχή";
    regionByDoctorId.set(d.id, region);
    doctorCountByRegion.set(region, (doctorCountByRegion.get(region) ?? 0) + 1);
  }

  const visitCountByRegion = new Map<string, number>();
  if (cycle && regionByDoctorId.size > 0) {
    let visitsQuery = supabase
      .from("visits")
      .select("doctor_id")
      .eq("cycle_id", cycle.id)
      .eq("status", "completed");
    if (repId) visitsQuery = visitsQuery.eq("rep_id", repId);
    const { data: visits } = await visitsQuery;
    for (const v of visits ?? []) {
      if (!v.doctor_id) continue;
      const region = regionByDoctorId.get(v.doctor_id);
      if (!region) continue;
      visitCountByRegion.set(region, (visitCountByRegion.get(region) ?? 0) + 1);
    }
  }

  return [...doctorCountByRegion.entries()]
    .map(([region, doctorCount]) => ({
      region,
      doctorCount,
      visitsThisCycle: visitCountByRegion.get(region) ?? 0,
    }))
    .sort((a, b) => b.doctorCount - a.doctorCount);
}
