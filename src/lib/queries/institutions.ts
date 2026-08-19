import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;
type Cycle = Database["public"]["Tables"]["cycles"]["Row"];
type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

export interface InstitutionGroup {
  name: string;
  doctors: Doctor[];
}

/** Όλοι οι γιατροί ιδρύματος, ομαδοποιημένοι ανά νοσοκομείο. */
export async function getInstitutionGroups(supabase: Client): Promise<InstitutionGroup[]> {
  const { data } = await supabase
    .from("doctors")
    .select("*")
    .not("institution", "is", null)
    .order("last_name", { ascending: true });

  const byName = new Map<string, Doctor[]>();
  for (const d of data ?? []) {
    const name = d.institution!;
    const arr = byName.get(name) ?? [];
    arr.push(d);
    byName.set(name, arr);
  }

  return [...byName.entries()]
    .map(([name, doctors]) => ({ name, doctors }))
    .sort((a, b) => b.doctors.length - a.doctors.length);
}

export interface InstitutionVisitStats {
  doctorCount: number;
  visitsThisCycle: number;
  byRep: { repId: string; repName: string; count: number }[];
}

export async function getInstitutionVisitStats(
  supabase: Client,
  institution: string,
  cycle: Cycle | null,
): Promise<InstitutionVisitStats> {
  const { data: doctors } = await supabase
    .from("doctors")
    .select("id")
    .eq("institution", institution);
  const doctorIds = (doctors ?? []).map((d) => d.id);

  if (!cycle || doctorIds.length === 0) {
    return { doctorCount: doctorIds.length, visitsThisCycle: 0, byRep: [] };
  }

  const { data: visits } = await supabase
    .from("visits")
    .select("rep_id, profiles!visits_rep_id_fkey(full_name)")
    .in("doctor_id", doctorIds)
    .eq("cycle_id", cycle.id)
    .eq("status", "completed");

  const countByRep = new Map<string, { repName: string; count: number }>();
  for (const v of visits ?? []) {
    const repName = (v.profiles as unknown as { full_name: string } | null)?.full_name ?? "—";
    const entry = countByRep.get(v.rep_id) ?? { repName, count: 0 };
    entry.count++;
    countByRep.set(v.rep_id, entry);
  }

  return {
    doctorCount: doctorIds.length,
    visitsThisCycle: visits?.length ?? 0,
    byRep: [...countByRep.entries()]
      .map(([repId, v]) => ({ repId, repName: v.repName, count: v.count }))
      .sort((a, b) => b.count - a.count),
  };
}
