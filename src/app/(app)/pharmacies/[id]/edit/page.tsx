import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { Card } from "@/components/ui/Card";
import { PharmacyVisitForm } from "@/components/pharmacies/PharmacyVisitForm";
import { updatePharmacyVisit } from "../../actions";

export default async function EditPharmacyVisitPage({
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
    .from("pharmacy_visits")
    .select("*, cycles(name)")
    .eq("id", id)
    .maybeSingle();

  if (!visit) notFound();

  let doctorsQuery = supabase
    .from("doctors")
    .select("id, last_name, first_name")
    .eq("status", "active")
    .order("last_name");

  if (!manager) {
    doctorsQuery = doctorsQuery.eq("current_rep_id", profile.id);
  }

  const { data: doctors } = await doctorsQuery;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-primary-dark">
        Επεξεργασία επίσκεψης φαρμακείου
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <PharmacyVisitForm
          action={updatePharmacyVisit.bind(null, visit.id)}
          doctors={doctors ?? []}
          cycleId={visit.cycle_id}
          cycleName={visit.cycles?.name}
          defaultValues={{
            pharmacy_name: visit.pharmacy_name,
            visit_date: visit.visit_date,
            nearby_doctor_id: visit.nearby_doctor_id,
            notes: visit.notes,
          }}
          submitLabel="Αποθήκευση"
        />
      </Card>
    </div>
  );
}
