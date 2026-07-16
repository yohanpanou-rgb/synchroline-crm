import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  createCycle,
  updateCycle,
  setActiveCycle,
  setCycleTarget,
  recalculateTargets,
} from "./actions";
import { getAssignableReps } from "@/lib/queries/reps";

export default async function CyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "rep") redirect("/dashboard");
  const isAdmin = profile.role === "admin";
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: cycles } = await supabase
    .from("cycles")
    .select("*")
    .order("start_date", { ascending: false });

  const activeCycle = cycles?.find((c) => c.is_active) ?? null;

  const reps = await getAssignableReps(supabase);

  const { data: targets } = activeCycle
    ? await supabase
        .from("cycle_targets")
        .select("*")
        .eq("cycle_id", activeCycle.id)
    : { data: [] };

  const targetByRep = new Map((targets ?? []).map((t) => [t.rep_id, t]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-primary-dark">Κύκλοι & Στόχοι</h1>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Νέος κύκλος</CardTitle>
          </CardHeader>
          <form action={createCycle} className="grid gap-4 sm:grid-cols-3">
            <Input name="name" placeholder="π.χ. Κύκλος 5 2026" required />
            <Input type="date" name="start_date" required />
            <Input type="date" name="end_date" required />
            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input type="checkbox" name="activate" className="h-4 w-4" />
              Ενεργοποίηση αμέσως
            </label>
            <Button type="submit">Δημιουργία</Button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Κύκλοι</CardTitle>
        </CardHeader>
        <div className="divide-y divide-black/5">
          {cycles?.length === 0 && (
            <p className="py-4 text-sm text-ink/50">Δεν υπάρχουν κύκλοι ακόμα.</p>
          )}
          {cycles?.map((cycle) =>
            isAdmin ? (
              <div key={cycle.id} className="py-3">
                <form
                  action={updateCycle.bind(null, cycle.id)}
                  className="flex flex-wrap items-end gap-3"
                >
                  <div className="min-w-[160px] flex-1">
                    <label className="mb-1 block text-xs text-ink/50">
                      Όνομα
                    </label>
                    <Input name="name" defaultValue={cycle.name} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-ink/50">Από</label>
                    <Input
                      type="date"
                      name="start_date"
                      defaultValue={cycle.start_date}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-ink/50">Έως</label>
                    <Input
                      type="date"
                      name="end_date"
                      defaultValue={cycle.end_date}
                      required
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="md">
                    Αποθήκευση
                  </Button>
                  {cycle.is_active && <Badge tone="success">Ενεργός</Badge>}
                </form>
                {!cycle.is_active && (
                  <form
                    action={setActiveCycle.bind(null, cycle.id)}
                    className="mt-2"
                  >
                    <Button type="submit" variant="secondary" size="md">
                      Ενεργοποίηση
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <div key={cycle.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{cycle.name}</p>
                  <p className="text-xs text-ink/50">
                    {cycle.start_date} → {cycle.end_date}
                  </p>
                </div>
                {cycle.is_active && <Badge tone="success">Ενεργός</Badge>}
              </div>
            ),
          )}
        </div>
      </Card>

      {activeCycle && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Στόχοι — {activeCycle.name}</CardTitle>
            {isAdmin && (
              <form action={recalculateTargets.bind(null, activeCycle.id)}>
                <Button type="submit" variant="secondary" size="md">
                  Επαναφορά σε 5/ημέρα, 100%
                </Button>
              </form>
            )}
          </CardHeader>
          <div className="divide-y divide-black/5">
            {reps?.length === 0 && (
              <p className="py-4 text-sm text-ink/50">Δεν υπάρχουν reps.</p>
            )}
            {reps?.map((rep) => {
              const target = targetByRep.get(rep.id);
              return (
                <div key={rep.id} className="py-3">
                  <p className="mb-2 text-sm font-medium text-ink">
                    {rep.full_name}
                  </p>
                  {isAdmin ? (
                    <form
                      action={setCycleTarget}
                      className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end"
                    >
                      <input type="hidden" name="rep_id" value={rep.id} />
                      <input type="hidden" name="cycle_id" value={activeCycle.id} />
                      <div>
                        <label className="mb-1 block text-xs text-ink/50">
                          Στόχος επισκέψεων
                        </label>
                        <Input
                          type="number"
                          min="0"
                          name="target_visits"
                          defaultValue={target?.target_visits ?? 0}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink/50">
                          Στόχος κάλυψης %
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          name="target_coverage_pct"
                          defaultValue={target?.target_coverage_pct ?? 0}
                        />
                      </div>
                      <Button type="submit" variant="secondary" size="md">
                        Αποθήκευση
                      </Button>
                    </form>
                  ) : (
                    <p className="text-sm text-ink/50">
                      Στόχος: {target?.target_visits ?? 0} επισκέψεις ·{" "}
                      {target?.target_coverage_pct ?? 0}% κάλυψη
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
