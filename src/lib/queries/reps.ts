import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

/**
 * People who can be assigned as a doctor's rep / logged against a visit.
 * Includes managers (e.g. field leads who also carry their own territory),
 * not just role='rep'.
 */
export async function getAssignableReps(
  supabase: Client,
): Promise<{ id: string; full_name: string }[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["rep", "manager"])
    .eq("is_active", true)
    .order("full_name");
  return data ?? [];
}
