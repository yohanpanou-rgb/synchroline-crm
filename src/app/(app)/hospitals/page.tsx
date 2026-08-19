import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { getInstitutionGroups } from "@/lib/queries/institutions";
import { HospitalAccordion } from "@/components/hospitals/HospitalAccordion";

export default async function HospitalsPage() {
  await requireProfile();
  const supabase = await createClient();
  const groups = await getInstitutionGroups(supabase);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-primary-dark">
        Νοσοκομεία
      </h1>
      <p className="mb-6 text-sm text-ink/50">
        Κοινόχρηστο πελατολόγιο ανά νοσοκομείο — δεν ανήκει στο προσωπικό
        πελατολόγιο κανενός rep.
      </p>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink/50">
          Δεν υπάρχουν ακόμα γιατροί νοσοκομείου.
        </p>
      ) : (
        <HospitalAccordion groups={groups} />
      )}
    </div>
  );
}
