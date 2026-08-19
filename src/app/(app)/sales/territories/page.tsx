import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getAssignableReps } from "@/lib/queries/reps";
import { getDistinctSalesNomoi } from "@/lib/queries/sales";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { setNomosReps } from "../actions";

export default async function SalesTerritoriesPage() {
  const profile = await requireProfile();
  if (!isManagerOrAdmin(profile.role)) redirect("/sales");
  const supabase = await createClient();

  const [nomoi, reps, { data: assignments }] = await Promise.all([
    getDistinctSalesNomoi(supabase),
    getAssignableReps(supabase),
    supabase.from("sales_territory_reps").select("nomos, rep_id"),
  ]);

  const repsByNomos = new Map<string, Set<string>>();
  for (const a of assignments ?? []) {
    if (!repsByNomos.has(a.nomos)) repsByNomos.set(a.nomos, new Set());
    repsByNomos.get(a.nomos)!.add(a.rep_id);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton fallbackHref="/sales" />
      <h1 className="mb-1 text-xl font-semibold text-primary-dark">
        Ανάθεση νομών σε reps
      </h1>
      <p className="mb-6 text-sm text-ink/50">
        Ένας νομός μπορεί να ανατεθεί σε παραπάνω από έναν rep (π.χ. η Αττική
        σε όλους όσους την καλύπτουν). Οι reps βλέπουν στο dashboard
        πωλήσεων μόνο τους νομούς που τους έχεις αναθέσει εδώ.
      </p>

      {nomoi.length === 0 && (
        <p className="text-sm text-ink/50">
          Δεν υπάρχουν ακόμα δεδομένα πωλήσεων — ανέβασε πρώτα ένα αρχείο.
        </p>
      )}

      <div className="space-y-3">
        {nomoi.map((nomos) => {
          const assignedRepIds = repsByNomos.get(nomos) ?? new Set();
          return (
            <Card key={nomos}>
              <CardHeader>
                <CardTitle>{nomos}</CardTitle>
              </CardHeader>
              <form action={setNomosReps.bind(null, nomos)} className="space-y-2">
                <div className="flex flex-wrap gap-3">
                  {reps.map((rep) => (
                    <label key={rep.id} className="flex items-center gap-1.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        name="repIds"
                        value={rep.id}
                        defaultChecked={assignedRepIds.has(rep.id)}
                        className="h-4 w-4"
                      />
                      {rep.full_name}
                    </label>
                  ))}
                </div>
                <Button type="submit" variant="secondary" size="md">
                  Αποθήκευση
                </Button>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
