import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getInstitutionGroups, getHospitalVisitLog } from "@/lib/queries/institutions";
import { getAssignableReps } from "@/lib/queries/reps";
import { HospitalAccordion } from "@/components/hospitals/HospitalAccordion";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDateGR } from "@/lib/constants/schedule";
import { createInstitution } from "./actions";

const VISIT_STATUS_LABEL: Record<string, string> = {
  planned: "Προγραμματισμένη",
  completed: "Ολοκληρωμένη",
  cancelled: "Ακυρωμένη",
};

export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireProfile();
  const manager = isManagerOrAdmin(profile.role);
  const supabase = await createClient();
  const [groups, reps, visitLog] = await Promise.all([
    getInstitutionGroups(supabase, manager ? undefined : profile.id),
    getAssignableReps(supabase),
    getHospitalVisitLog(supabase, { repId: manager ? undefined : profile.id }),
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {manager ? "Ιστορικό επισκέψεων νοσοκομείων" : "Οι επισκέψεις μου σε νοσοκομεία"}
          </CardTitle>
        </CardHeader>
        {visitLog.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink/50">
            Δεν υπάρχουν ακόμα επισκέψεις νοσοκομείου.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                  <th className="py-2 pr-3 font-medium">Ημερομηνία</th>
                  <th className="py-2 pr-3 font-medium">Νοσοκομείο</th>
                  {manager && <th className="py-2 pr-3 font-medium">Rep</th>}
                  <th className="py-2 pr-3 font-medium">Γιατροί που είδε</th>
                  <th className="py-2 pr-3 font-medium">Κατάσταση</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {visitLog.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 pr-3 tabular-nums text-ink/70">
                      {v.date ? formatDateGR(v.date) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-ink">{v.hospitalName}</td>
                    {manager && <td className="py-2.5 pr-3 text-ink/70">{v.repName}</td>}
                    <td className="py-2.5 pr-3 text-ink/70">
                      {v.doctorNames.length > 0 ? v.doctorNames.join(", ") : "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={v.status === "completed" ? "success" : "neutral"}>
                        {VISIT_STATUS_LABEL[v.status] ?? v.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
