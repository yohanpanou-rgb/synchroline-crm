import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getAssignableReps } from "@/lib/queries/reps";
import { formatDoctorName } from "@/lib/utils/name-normalization";

type Cycle = Database["public"]["Tables"]["cycles"]["Row"];
type Client = SupabaseClient<Database>;

export interface RepMetricsDoctor {
  id: string;
  name: string;
  visited: boolean;
}

export interface RepMetrics {
  repId: string;
  repName: string;
  territorySize: number;
  coveredCount: number;
  coveragePct: number;
  targetCoveragePct: number;
  targetVisits: number;
  visitsCompleted: number;
  visitsPlanned: number;
  doctors: RepMetricsDoctor[];
}

export async function getActiveCycle(supabase: Client): Promise<Cycle | null> {
  const { data } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  return data ?? null;
}

export async function getRepMetrics(
  supabase: Client,
  repId: string,
  repName: string,
  cycle: Cycle | null,
): Promise<RepMetrics> {
  const { data: territoryDoctors } = await supabase
    .from("doctors")
    .select("id, last_name, first_name")
    .eq("current_rep_id", repId)
    .eq("status", "active")
    .neq("rating_cpo", "0")
    .is("institution", null)
    .order("last_name", { ascending: true });

  const territorySize = territoryDoctors?.length ?? 0;

  if (!cycle) {
    return {
      repId,
      repName,
      territorySize,
      coveredCount: 0,
      coveragePct: 0,
      targetCoveragePct: 0,
      targetVisits: 0,
      visitsCompleted: 0,
      visitsPlanned: 0,
      doctors: (territoryDoctors ?? []).map((d) => ({
        id: d.id,
        name: formatDoctorName(d.last_name, d.first_name),
        visited: false,
      })),
    };
  }

  const [{ data: completedVisits }, { count: visitsPlanned }, { data: target }] =
    await Promise.all([
      supabase
        .from("visits")
        .select("doctor_id")
        .eq("rep_id", repId)
        .eq("cycle_id", cycle.id)
        .eq("status", "completed"),
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("rep_id", repId)
        .eq("cycle_id", cycle.id)
        .eq("status", "planned"),
      supabase
        .from("cycle_targets")
        .select("target_visits, target_coverage_pct")
        .eq("rep_id", repId)
        .eq("cycle_id", cycle.id)
        .maybeSingle(),
    ]);

  const coveredIds = new Set(
    (completedVisits ?? []).map((v) => v.doctor_id).filter((id): id is string => !!id),
  );
  const coveredCount = coveredIds.size;
  const size = territorySize;
  const coveragePct = size > 0 ? (coveredCount / size) * 100 : 0;

  return {
    repId,
    repName,
    territorySize: size,
    coveredCount,
    coveragePct,
    targetCoveragePct: target?.target_coverage_pct ?? 0,
    targetVisits: target?.target_visits ?? 0,
    visitsCompleted: completedVisits?.length ?? 0,
    visitsPlanned: visitsPlanned ?? 0,
    doctors: (territoryDoctors ?? []).map((d) => ({
      id: d.id,
      name: formatDoctorName(d.last_name, d.first_name),
      visited: coveredIds.has(d.id),
    })),
  };
}

export async function getAllRepsMetrics(
  supabase: Client,
  cycle: Cycle | null,
): Promise<RepMetrics[]> {
  const reps = await getAssignableReps(supabase);

  return Promise.all(
    reps.map((rep) => getRepMetrics(supabase, rep.id, rep.full_name, cycle)),
  );
}
