import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { getAssignableReps } from "@/lib/queries/reps";
import { DoctorImportWizard } from "@/components/doctors/import/DoctorImportWizard";
import { BackButton } from "@/components/ui/BackButton";

export default async function DoctorsImportPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/doctors");
  const supabase = await createClient();
  const reps = await getAssignableReps(supabase);

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton fallbackHref="/doctors" />
      <h1 className="mb-1 text-xl font-semibold text-primary-dark">
        Εισαγωγή γιατρών
      </h1>
      <p className="mb-6 text-sm text-ink/50">
        Ανέβασε xlsx/csv, αντιστοίχισε τις στήλες στα πεδία του γιατρού, και
        επιβεβαίωσε. Γιατροί που ταιριάζουν με υπάρχον όνομα ενημερώνονται
        μόνο στα πεδία που αντιστοίχισες — οι υπόλοιποι δημιουργούνται νέοι.
      </p>
      <DoctorImportWizard reps={reps} />
    </div>
  );
}
