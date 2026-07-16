import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export interface CalendarVisit {
  id: string;
  doctor_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: Database["public"]["Tables"]["visits"]["Row"]["status"];
  doctor: {
    last_name: string;
    first_name: string;
    region: string | null;
    county: string | null;
  } | null;
  rep: { full_name: string } | null;
}

export async function getVisitsInRange(
  supabase: Client,
  { startISO, endISO, repId }: { startISO: string; endISO: string; repId?: string },
): Promise<CalendarVisit[]> {
  let query = supabase
    .from("visits")
    .select(
      "id, doctor_id, scheduled_date, scheduled_time, status, doctors(last_name, first_name, region, county), profiles!visits_rep_id_fkey(full_name)",
    )
    .in("status", ["planned", "completed"])
    .gte("scheduled_date", startISO)
    .lte("scheduled_date", endISO)
    .order("scheduled_time");

  if (repId) {
    query = query.eq("rep_id", repId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((v) => ({
    id: v.id,
    doctor_id: v.doctor_id,
    scheduled_date: v.scheduled_date!,
    scheduled_time: v.scheduled_time,
    status: v.status,
    doctor: v.doctors,
    rep: v.profiles,
  }));
}
