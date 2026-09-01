import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getInstitutionGroups } from "@/lib/queries/institutions";
import { getAssignableReps } from "@/lib/queries/reps";
import { HospitalAccordion } from "@/components/hospitals/HospitalAccordion";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createInstitution } from "./actions";

export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireProfile();
  const manager = isManagerOrAdmin(profile.role);
  const supabase = await createClient();
  const [groups, reps] = await Promise.all([
    getInstitutionGroups(supabase, manager ? undefined : profile.id),
    getAssignableReps(supabase),
  ]);
  const { error } = await searchParams;

  async function handleCreateInstitution(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "");
    const result = await createInstitution(name);
    if (result.error) {
      redirect(`/hospitals?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-primary-dark">
        Νοσοκομεία
      </h1>
      <p className="mb-6 text-sm text-ink/50">
        Ομαδοποίηση γιατρών ανά νοσοκομείο. Οι νοσοκομειακοί γιατροί δεν
        μετράνε στο προσωπικό πελατολόγιο/KPI κανενός rep — η ορατότητα ενός
        νοσοκομείου καθορίζεται από την ανάθεσή του σε συγκεκριμένο(ους) rep.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card className="mb-6">
        <form action={handleCreateInstitution} className="flex gap-2">
          <Input name="name" placeholder="π.χ. ΕΥΑΓΓΕΛΙΣΜΟΣ" required />
          <Button type="submit" variant="secondary" size="md">
            + Νέο νοσοκομείο
          </Button>
        </form>
      </Card>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink/50">
          Δεν υπάρχουν ακόμα νοσοκομεία.
        </p>
      ) : (
        <HospitalAccordion groups={groups} manager={manager} reps={reps} />
      )}
    </div>
  );
}
