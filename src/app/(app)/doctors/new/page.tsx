import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { DoctorForm } from "@/components/doctors/DoctorForm";
import { Card } from "@/components/ui/Card";
import { createDoctor } from "../actions";

export default async function NewDoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireProfile();
  const { error } = await searchParams;
  const manager = isManagerOrAdmin(profile.role);

  let reps: { id: string; full_name: string }[] = [];
  if (manager) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "rep")
      .eq("is_active", true)
      .order("full_name");
    reps = data ?? [];
  }

  return (
    <div className="mx-auto max-w-2xl">
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
          submitLabel={manager ? "Δημιουργία γιατρού" : "Υποβολή πρότασης"}
        />
      </Card>
    </div>
  );
}
