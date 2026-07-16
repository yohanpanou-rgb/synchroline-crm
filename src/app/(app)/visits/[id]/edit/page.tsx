import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getAssignableReps } from "@/lib/queries/reps";
import { Card } from "@/components/ui/Card";
import { VisitForm } from "@/components/visits/VisitForm";
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
    .select("*, doctors(last_name, first_name), cycles(name)")
    .eq("id", id)
    .maybeSingle();

  if (!visit) notFound();

  const { data: productRows } = await supabase
    .from("visit_products")
    .select("product_name, samples_given, notes")
    .eq("visit_id", id);

  const products = Object.fromEntries(
    (productRows ?? []).map((p) => [p.product_name, { samples_given: p.samples_given, notes: p.notes }]),
  ) as Partial<Record<ProductName, { samples_given: number; notes: string | null }>>;

  const reps = manager ? await getAssignableReps(supabase) : undefined;

  return (
    <div className="mx-auto max-w-2xl">
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
          visit={{
            doctor_id: visit.doctor_id,
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
          cycleId={visit.cycle_id}
          cycleName={visit.cycles?.name}
          submitLabel="Αποθήκευση"
        />
      </Card>
    </div>
  );
}
