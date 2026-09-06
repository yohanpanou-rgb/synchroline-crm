import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { formatDoctorName } from "@/lib/utils/name-normalization";

type Client = SupabaseClient<Database>;
type Cycle = Database["public"]["Tables"]["cycles"]["Row"];
type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

export interface InstitutionGroup {
  id: string;
  name: string;
  isShared: boolean;
  repIds: string[];
  doctors: Doctor[];
}

/** Κανονικός κατάλογος νοσοκομείων (για dropdown/επιλογή). */
export async function getInstitutionsList(supabase: Client): Promise<string[]> {
  const { data } = await supabase.from("institutions").select("name").order("name");
  return (data ?? []).map((r) => r.name);
}

/**
 * Όλα τα νοσοκομεία από τον κατάλογο, με τους γιατρούς τους (άδεια λίστα αν
 * δεν έχει ανατεθεί ακόμα κανείς) — έτσι ένα νοσοκομείο εμφανίζεται στη
 * λίστα ακόμα κι αν δεν έχει γιατρούς ακόμα. Αν δοθεί `onlyRelevantToRepId`,
 * επιστρέφονται μόνο τα νοσοκομεία ανατεθειμένα στον συγκεκριμένο rep
 * (institution_reps) — ή, αν δεν έχει ανατεθεί ρητά κανένας rep ακόμα, τα
 * κοινόχρηστα (is_shared), ώστε να μη χαθεί ορατότητα μέχρι να γίνει ανάθεση.
 */
export async function getInstitutionGroups(
  supabase: Client,
  onlyRelevantToRepId?: string,
): Promise<InstitutionGroup[]> {
  const [{ data: institutions }, { data: doctors }, { data: assignments }] = await Promise.all([
    supabase.from("institutions").select("id, name, is_shared").order("name"),
    supabase
      .from("doctors")
      .select("*")
      .not("institution", "is", null)
      .order("last_name", { ascending: true }),
    supabase.from("institution_reps").select("institution_id, rep_id"),
  ]);

  const repIdsByInstitutionId = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    const arr = repIdsByInstitutionId.get(a.institution_id) ?? [];
    arr.push(a.rep_id);
    repIdsByInstitutionId.set(a.institution_id, arr);
  }

  const infoByName = new Map<string, { id: string; isShared: boolean; repIds: string[] }>();
  const byName = new Map<string, Doctor[]>();
  for (const inst of institutions ?? []) {
    infoByName.set(inst.name, {
      id: inst.id,
      isShared: inst.is_shared,
      repIds: repIdsByInstitutionId.get(inst.id) ?? [],
    });
    byName.set(inst.name, []);
  }
  for (const d of doctors ?? []) {
    const name = d.institution!;
    const arr = byName.get(name) ?? [];
    arr.push(d);
    byName.set(name, arr);
  }

  let groups = [...byName.entries()].map(([name, docs]) => {
    const info = infoByName.get(name);
    return {
      id: info?.id ?? name,
      name,
      isShared: info?.isShared ?? false,
      repIds: info?.repIds ?? [],
      doctors: docs,
    };
  });

  if (onlyRelevantToRepId) {
    groups = groups.filter((g) =>
      g.repIds.length > 0 ? g.repIds.includes(onlyRelevantToRepId) : g.isShared,
    );
  }

  return groups.sort((a, b) => b.doctors.length - a.doctors.length);
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

export interface HospitalVisitLogEntry {
  id: string;
  date: string | null;
  status: string;
  hospitalName: string;
  repName: string;
  doctorNames: string[];
}

/**
 * Ιστορικό επισκέψεων-νοσοκομείου (visits.hospital_id not null) — ημερομηνία,
 * νοσοκομείο, rep, και ποιοι γιατροί καταγράφηκαν ως ενημερωμένοι στη
 * συγκεκριμένη επίσκεψη. Ένας rep βλέπει μόνο τις δικές του επισκέψεις,
 * manager/admin βλέπει όλες.
 */
export async function getHospitalVisitLog(
  supabase: Client,
  { repId, limit = 50 }: { repId?: string; limit?: number } = {},
): Promise<HospitalVisitLogEntry[]> {
  let query = supabase
    .from("visits")
    .select(
      "id, scheduled_date, completed_date, status, institutions(name), profiles!visits_rep_id_fkey(full_name)",
    )
    .not("hospital_id", "is", null)
    .order("scheduled_date", { ascending: false })
    .limit(limit);

  if (repId) query = query.eq("rep_id", repId);

  const { data: visits } = await query;
  const visitIds = (visits ?? []).map((v) => v.id);

  const { data: links } =
    visitIds.length > 0
      ? await supabase
          .from("visit_hospital_doctors")
          .select("visit_id, doctors(last_name, first_name)")
          .in("visit_id", visitIds)
      : { data: [] as { visit_id: string; doctors: { last_name: string; first_name: string } | null }[] };

  const doctorNamesByVisitId = new Map<string, string[]>();
  for (const l of links ?? []) {
    if (!l.doctors) continue;
    const arr = doctorNamesByVisitId.get(l.visit_id) ?? [];
    arr.push(formatDoctorName(l.doctors.last_name, l.doctors.first_name));
    doctorNamesByVisitId.set(l.visit_id, arr);
  }

  return (visits ?? []).map((v) => ({
    id: v.id,
    date: v.scheduled_date ?? v.completed_date,
    status: v.status,
    hospitalName: v.institutions?.name ?? "—",
    repName: v.profiles?.full_name ?? "—",
    doctorNames: doctorNamesByVisitId.get(v.id) ?? [],
  }));
}
