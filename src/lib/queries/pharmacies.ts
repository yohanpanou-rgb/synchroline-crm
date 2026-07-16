import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { startOfWeek, addDays, toISODate } from "@/lib/constants/schedule";

type Client = SupabaseClient<Database>;

export interface PharmacyWeekMetrics {
  repId: string;
  repName: string;
  count: number;
}

/** Mon-Fri visit count for the week containing `anchor` (defaults to today). */
export async function getWeekPharmacyVisitCount(
  supabase: Client,
  repId: string,
  anchor: Date = new Date(),
): Promise<number> {
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 4);

  const { count } = await supabase
    .from("pharmacy_visits")
    .select("id", { count: "exact", head: true })
    .eq("rep_id", repId)
    .gte("visit_date", toISODate(weekStart))
    .lte("visit_date", toISODate(weekEnd));

  return count ?? 0;
}

export async function getAllRepsPharmacyMetrics(
  supabase: Client,
  reps: { id: string; full_name: string }[],
  anchor: Date = new Date(),
): Promise<PharmacyWeekMetrics[]> {
  return Promise.all(
    reps.map(async (rep) => ({
      repId: rep.id,
      repName: rep.full_name,
      count: await getWeekPharmacyVisitCount(supabase, rep.id, anchor),
    })),
  );
}
