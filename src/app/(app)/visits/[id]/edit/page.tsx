import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getAssignableReps } from "@/lib/queries/reps";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";
import { VisitForm } from "@/components/visits/VisitForm";
import { ActivityHistory } from "@/components/audit/ActivityHistory";
import { getRecordHistory } from "@/lib/queries/audit";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { updateVisit } from "../../actions";
import type { ProductName } from "@/lib/types/database.types";

export default async function EditVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const { error } = await searchParams;
  const manager = isManagerOrAdmin(profile.role);
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select("*, doctors(last_name, first_name), institutions(id, name), cycles(name)")
    .eq("id", id)
    .maybeSingle();

  if (!visit) notFound();

  let hospitalDoctors: { id: string; last_name: string; first_name: string }[] = [];
  let selectedHospitalDoctorIds: string[] = [];
  if (visit.hospital_id) {
    const [{ data: hdRows }, { data: linkRows }] = await Promise.all([
      supabase
        .from("doctors")
        .select("id, last_name, first_name")
        .eq("institution", visit.institutions?.name ?? ""),
      supabase.from("visit_hospital_doctors").select("doctor_id").eq("visit_id", id),
    ]);
    hospitalDoctors = hdRows ?? [];
    selectedHospitalDoctorIds = (linkRows ?? []).map((r) => r.doctor_id);
  }

  const { data: productRows } = await supabase
    .from("visit_products")
    .select("product_name, samples_given, notes")
    .eq("visit_id", id);

  const products = Object.fromEntries(
    (productRows ?? []).map((p) => [p.product_name, { samples_given: p.samples_given, notes: p.notes }]),
  ) as Partial<Record<ProductName, { samples_given: number; notes: string | null }>>;

  const { data: competitorRows } = await supabase
    .from("visit_competitor_mentions")
    .select("category, competitor_name")
    .eq("visit_id", id);
  const existingCompetitors = (competitorRows ?? []).map((c) => ({
    category: c.category,
    competitorName: c.competitor_name,
  }));

  const reps = manager ? await getAssignableReps(supabase) : undefined;
  const history = manager ? await getRecordHistory(supabase, "visits", id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton fallbackHref="/visits" />
      <h1 className="mb-6 text-xl font-semibold text-primary-dark">
        Επεξεργασία επίσκεψης
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <VisitForm
          action={updateVisit.bind(null, visit.id)}
          doctors={[]}
          reps={reps}
          doctorName={
            visit.doctors
              ? formatDoctorName(visit.doctors.last_name, visit.doctors.first_name)
              : undefined
          }
          hospitalName={visit.institutions?.name ?? undefined}
          hospitals={
            visit.hospital_id
              ? [{ id: visit.hospital_id, name: visit.institutions?.name ?? "", doctors: hospitalDoctors }]
              : undefined
          }
          selectedHospitalDoctorIds={selectedHospitalDoctorIds}
          visit={{
            doctor_id: visit.doctor_id,
            hospital_id: visit.hospital_id,
            rep_id: visit.rep_id,
            visit_type: visit.visit_type,
            status: visit.status,
            scheduled_date: visit.scheduled_date,
            scheduled_time: visit.scheduled_time,
            completed_date: visit.completed_date,
            notes: visit.notes,
            location_context: visit.location_context,
          }}
          products={products}
          existingCompetitors={existingCompetitors}
          cycleId={visit.cycle_id}
          cycleName={visit.cycles?.name}
          submitLabel="Αποθήκευση"
        />
      </Card>

      {manager && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Ιστορικό αλλαγών</CardTitle>
          </CardHeader>
          <ActivityHistory entries={history} />
        </Card>
      )}
    </div>
  );
}
