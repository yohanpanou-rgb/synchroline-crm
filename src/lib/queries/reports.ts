import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getAssignableReps } from "@/lib/queries/reps";

type Client = SupabaseClient<Database>;
type Cycle = Database["public"]["Tables"]["cycles"]["Row"];

export interface RepDataEntryQuality {
  repId: string;
  repName: string;
  completedVisits: number;
  withNotesCount: number;
  withNotesPct: number;
  withCompetitorDataCount: number;
  withCompetitorDataPct: number;
}

/**
 * Πόσο "πλούσιες" είναι οι καταχωρήσεις κάθε rep στον τρέχοντα κύκλο —
 * ποσοστό ολοκληρωμένων επισκέψεων με σημειώσεις και με καταγεγραμμένα
 * στοιχεία ανταγωνισμού.
 */
export async function getDataEntryQuality(
  supabase: Client,
  cycle: Cycle | null,
): Promise<RepDataEntryQuality[]> {
  const reps = await getAssignableReps(supabase);
  if (!cycle || reps.length === 0) {
    return reps.map((r) => ({
      repId: r.id,
      repName: r.full_name,
      completedVisits: 0,
      withNotesCount: 0,
      withNotesPct: 0,
      withCompetitorDataCount: 0,
      withCompetitorDataPct: 0,
    }));
  }

  const { data: visits } = await supabase
    .from("visits")
    .select("id, rep_id, notes")
    .eq("cycle_id", cycle.id)
    .eq("status", "completed");

  const visitIds = (visits ?? []).map((v) => v.id);
  const { data: mentions } =
    visitIds.length > 0
      ? await supabase.from("visit_competitor_mentions").select("visit_id").in("visit_id", visitIds)
      : { data: [] as { visit_id: string }[] };

  const visitIdsWithCompetitorData = new Set((mentions ?? []).map((m) => m.visit_id));

  return reps.map((rep) => {
    const repVisits = (visits ?? []).filter((v) => v.rep_id === rep.id);
    const completedVisits = repVisits.length;
    const withNotesCount = repVisits.filter((v) => !!v.notes?.trim()).length;
    const withCompetitorDataCount = repVisits.filter((v) => visitIdsWithCompetitorData.has(v.id)).length;

    return {
      repId: rep.id,
      repName: rep.full_name,
      completedVisits,
      withNotesCount,
      withNotesPct: completedVisits > 0 ? (withNotesCount / completedVisits) * 100 : 0,
      withCompetitorDataCount,
      withCompetitorDataPct: completedVisits > 0 ? (withCompetitorDataCount / completedVisits) * 100 : 0,
    };
  });
}

export interface CompetitorBrandStat {
  category: string;
  competitorName: string;
  mentions: number;
}

export interface CompetitorRepStat {
  repId: string;
  repName: string;
  mentions: number;
}

export interface CompetitorReport {
  byBrand: CompetitorBrandStat[];
  byRep: CompetitorRepStat[];
}

/** Ανταγωνιστικά brands ανά κατηγορία πάθησης, και ανά rep, στον τρέχοντα κύκλο. */
export async function getCompetitorMentionStats(
  supabase: Client,
  cycle: Cycle | null,
): Promise<CompetitorReport> {
  if (!cycle) return { byBrand: [], byRep: [] };

  const { data: visits } = await supabase
    .from("visits")
    .select("id, rep_id")
    .eq("cycle_id", cycle.id)
    .eq("status", "completed");

  const visitIds = (visits ?? []).map((v) => v.id);
  if (visitIds.length === 0) return { byBrand: [], byRep: [] };

  const repByVisitId = new Map((visits ?? []).map((v) => [v.id, v.rep_id]));

  const [{ data: mentions }, reps] = await Promise.all([
    supabase
      .from("visit_competitor_mentions")
      .select("visit_id, category, competitor_name")
      .in("visit_id", visitIds),
    getAssignableReps(supabase),
  ]);

  const repNameById = new Map(reps.map((r) => [r.id, r.full_name]));

  const byBrandMap = new Map<string, CompetitorBrandStat>();
  const byRepMap = new Map<string, number>();

  for (const m of mentions ?? []) {
    const brandKey = `${m.category}::${m.competitor_name}`;
    const brandEntry = byBrandMap.get(brandKey) ?? {
      category: m.category,
      competitorName: m.competitor_name,
      mentions: 0,
    };
    brandEntry.mentions++;
    byBrandMap.set(brandKey, brandEntry);

    const repId = repByVisitId.get(m.visit_id);
    if (repId) byRepMap.set(repId, (byRepMap.get(repId) ?? 0) + 1);
  }

  return {
    byBrand: [...byBrandMap.values()].sort((a, b) => b.mentions - a.mentions),
    byRep: [...byRepMap.entries()]
      .map(([repId, mentions]) => ({ repId, repName: repNameById.get(repId) ?? "—", mentions }))
      .sort((a, b) => b.mentions - a.mentions),
  };
}

export interface HospitalCoverageDoctor {
  id: string;
  name: string;
}

export interface HospitalCoverageEntry {
  id: string;
  name: string;
  doctorCount: number;
  coveredDoctors: HospitalCoverageDoctor[];
  uncoveredDoctors: HospitalCoverageDoctor[];
  visitsThisCycle: number;
  byRep: { repId: string; repName: string; count: number }[];
}

/**
 * Για κάθε νοσοκομείο: πόσοι/ποιοι γιατροί καλύφθηκαν στον τρέχοντα κύκλο
 * (είτε μέσω επίσκεψης-νοσοκομείου με τσεκαρισμένο γιατρό, είτε μέσω
 * απευθείας επίσκεψης στον γιατρό — π.χ. manager) και ποιοι όχι, καθώς και
 * πόσες φορές δέχθηκε επίσκεψη το νοσοκομείο και από ποιον rep.
 */
export async function getHospitalCoverageReport(
  supabase: Client,
  cycle: Cycle | null,
): Promise<HospitalCoverageEntry[]> {
  const [{ data: institutions }, { data: doctors }, reps] = await Promise.all([
    supabase.from("institutions").select("id, name").order("name"),
    supabase
      .from("doctors")
      .select("id, last_name, first_name, institution")
      .not("institution", "is", null)
      .eq("status", "active"),
    getAssignableReps(supabase),
  ]);

  const repNameById = new Map(reps.map((r) => [r.id, r.full_name]));
  const doctorsByInstitutionName = new Map<string, HospitalCoverageDoctor[]>();
  for (const d of doctors ?? []) {
    const name = d.institution!;
    const arr = doctorsByInstitutionName.get(name) ?? [];
    arr.push({ id: d.id, name: `${d.last_name} ${d.first_name}` });
    doctorsByInstitutionName.set(name, arr);
  }

  if (!cycle) {
    return (institutions ?? []).map((inst) => {
      const hospitalDoctors = doctorsByInstitutionName.get(inst.name) ?? [];
      return {
        id: inst.id,
        name: inst.name,
        doctorCount: hospitalDoctors.length,
        coveredDoctors: [],
        uncoveredDoctors: hospitalDoctors,
        visitsThisCycle: 0,
        byRep: [],
      };
    });
  }

  const [{ data: hospitalVisits }, { data: directVisits }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, hospital_id, rep_id")
      .eq("cycle_id", cycle.id)
      .eq("status", "completed")
      .not("hospital_id", "is", null),
    supabase
      .from("visits")
      .select("doctor_id, rep_id")
      .eq("cycle_id", cycle.id)
      .eq("status", "completed")
      .not("doctor_id", "is", null),
  ]);

  const hospitalVisitIds = (hospitalVisits ?? []).map((v) => v.id);
  const { data: hospitalVisitDoctors } =
    hospitalVisitIds.length > 0
      ? await supabase
          .from("visit_hospital_doctors")
          .select("visit_id, doctor_id")
          .in("visit_id", hospitalVisitIds)
      : { data: [] as { visit_id: string; doctor_id: string }[] };

  const hospitalVisitById = new Map((hospitalVisits ?? []).map((v) => [v.id, v]));
  const institutionNameById = new Map((institutions ?? []).map((i) => [i.id, i.name]));
  const doctorInstitutionById = new Map((doctors ?? []).map((d) => [d.id, d.institution!]));

  const coveredDoctorIdsByInstitution = new Map<string, Set<string>>();
  const visitCountByInstitution = new Map<string, number>();
  const repCountByInstitution = new Map<string, Map<string, number>>();

  function markVisit(institutionName: string, repId: string) {
    visitCountByInstitution.set(institutionName, (visitCountByInstitution.get(institutionName) ?? 0) + 1);
    const repMap = repCountByInstitution.get(institutionName) ?? new Map<string, number>();
    repMap.set(repId, (repMap.get(repId) ?? 0) + 1);
    repCountByInstitution.set(institutionName, repMap);
  }

  for (const hvd of hospitalVisitDoctors ?? []) {
    const visit = hospitalVisitById.get(hvd.visit_id);
    if (!visit?.hospital_id) continue;
    const institutionName = institutionNameById.get(visit.hospital_id);
    if (!institutionName) continue;
    const set = coveredDoctorIdsByInstitution.get(institutionName) ?? new Set<string>();
    set.add(hvd.doctor_id);
    coveredDoctorIdsByInstitution.set(institutionName, set);
  }

  for (const v of hospitalVisits ?? []) {
    const institutionName = v.hospital_id ? institutionNameById.get(v.hospital_id) : undefined;
    if (!institutionName) continue;
    markVisit(institutionName, v.rep_id);
  }

  for (const v of directVisits ?? []) {
    if (!v.doctor_id) continue;
    const institutionName = doctorInstitutionById.get(v.doctor_id);
    if (!institutionName) continue;
    const set = coveredDoctorIdsByInstitution.get(institutionName) ?? new Set<string>();
    set.add(v.doctor_id);
    coveredDoctorIdsByInstitution.set(institutionName, set);
    markVisit(institutionName, v.rep_id);
  }

  return (institutions ?? []).map((inst) => {
    const hospitalDoctors = doctorsByInstitutionName.get(inst.name) ?? [];
    const coveredIds = coveredDoctorIdsByInstitution.get(inst.name) ?? new Set<string>();
    const repMap = repCountByInstitution.get(inst.name) ?? new Map<string, number>();

    return {
      id: inst.id,
      name: inst.name,
      doctorCount: hospitalDoctors.length,
      coveredDoctors: hospitalDoctors.filter((d) => coveredIds.has(d.id)),
      uncoveredDoctors: hospitalDoctors.filter((d) => !coveredIds.has(d.id)),
      visitsThisCycle: visitCountByInstitution.get(inst.name) ?? 0,
      byRep: [...repMap.entries()]
        .map(([repId, count]) => ({ repId, repName: repNameById.get(repId) ?? "—", count }))
        .sort((a, b) => b.count - a.count),
    };
  });
}

export interface RepHospitalMetrics {
  repId: string;
  repName: string;
  hospitalDoctorCount: number;
  hospitalDoctorsVisited: number;
  hospitalCoveragePct: number;
  hospitalVisitsThisCycle: number;
}

/**
 * Νοσοκομειακές μετρήσεις ανά rep — άθροισμα σε όλα τα νοσοκομεία που του
 * έχουν ανατεθεί (institution_reps). Ξεχωριστό KPI από το ιδιωτικό
 * πελατολόγιο (RepMetrics.territorySize), ώστε οι νοσοκομειακοί γιατροί να
 * μην αλλοιώνουν το βασικό coverage του rep, αλλά να παραμένουν ορατοί.
 */
export async function getAllRepsHospitalMetrics(
  supabase: Client,
  cycle: Cycle | null,
): Promise<RepHospitalMetrics[]> {
  const [reps, coverage, { data: assignments }] = await Promise.all([
    getAssignableReps(supabase),
    getHospitalCoverageReport(supabase, cycle),
    supabase.from("institution_reps").select("institution_id, rep_id"),
  ]);

  const repIdsByInstitutionId = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    const arr = repIdsByInstitutionId.get(a.institution_id) ?? [];
    arr.push(a.rep_id);
    repIdsByInstitutionId.set(a.institution_id, arr);
  }

  return reps.map((rep) => {
    let hospitalDoctorCount = 0;
    let hospitalDoctorsVisited = 0;
    let hospitalVisitsThisCycle = 0;

    for (const entry of coverage) {
      const assignedReps = repIdsByInstitutionId.get(entry.id) ?? [];
      if (!assignedReps.includes(rep.id)) continue;
      hospitalDoctorCount += entry.doctorCount;
      hospitalDoctorsVisited += entry.coveredDoctors.length;
      hospitalVisitsThisCycle += entry.byRep.find((r) => r.repId === rep.id)?.count ?? 0;
    }

    return {
      repId: rep.id,
      repName: rep.full_name,
      hospitalDoctorCount,
      hospitalDoctorsVisited,
      hospitalCoveragePct:
        hospitalDoctorCount > 0 ? (hospitalDoctorsVisited / hospitalDoctorCount) * 100 : 0,
      hospitalVisitsThisCycle,
    };
  });
}

export async function getRepHospitalMetrics(
  supabase: Client,
  repId: string,
  cycle: Cycle | null,
): Promise<RepHospitalMetrics | undefined> {
  const all = await getAllRepsHospitalMetrics(supabase, cycle);
  return all.find((m) => m.repId === repId);
}
