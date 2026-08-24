import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { DoctorForm } from "@/components/doctors/DoctorForm";
import { Card } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";
import { createDoctor } from "../actions";
import { getAssignableReps } from "@/lib/queries/reps";
import { getInstitutionsList } from "@/lib/queries/institutions";

export default async function NewDoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; institution?: string }>;
}) {
  const profile = await requireProfile();
  const { error, institution } = await searchParams;
  const manager = isManagerOrAdmin(profile.role);

  const supabase = await createClient();
  const reps = await getAssignableReps(supabase);
  const institutions = manager ? await getInstitutionsList(supabase) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton fallbackHref="/doctors" />
      <h1 className="mb-1 text-xl font-semibold text-primary-dark">
        {manager ? "Νέος γιατρός" : "Πρόταση νέου γιατρού"}
      </h1>
      <p className="mb-6 text-sm text-ink/50">
        {manager
          ? "Ο γιατρός δημιουργείται απευθείας με την κατάσταση που επιλέξεις."
          : "Ο γιατρός θα εμφανιστεί στο πελατολόγιό σου μόλις εγκριθεί από τον manager."}
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <DoctorForm
          action={createDoctor}
          isManager={manager}
          reps={reps}
          institutions={institutions}
          defaultInstitution={institution}
          submitLabel={manager ? "Δημιουργία γιατρού" : "Υποβολή πρότασης"}
        />
      </Card>
    </div>
  );
}
