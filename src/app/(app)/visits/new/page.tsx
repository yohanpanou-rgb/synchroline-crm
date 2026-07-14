import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getActiveCycle } from "@/lib/queries/dashboard";
import { Card } from "@/components/ui/Card";
import { VisitForm } from "@/components/visits/VisitForm";
import { createVisit } from "../actions";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ doctorId?: string; error?: string }>;
}) {
  const profile = await requireProfile();
  const { doctorId, error } = await searchParams;
  const manager = isManagerOrAdmin(profile.role);
  const supabase = await createClient();

  let doctorsQuery = supabase
    .from("doctors")
    .select("id, last_name, first_name")
    .eq("status", "active")
    .order("last_name");

  if (!manager) {
    doctorsQuery = doctorsQuery.eq("current_rep_id", profile.id);
  }

  const [{ data: doctors }, cycle, repsResult] = await Promise.all([
    doctorsQuery,
    getActiveCycle(supabase),
    manager
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "rep")
          .eq("is_active", true)
          .order("full_name")
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-primary-dark">
        Νέα επίσκεψη
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!cycle && (
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          Δεν υπάρχει ενεργός κύκλος — ζήτησε από τον admin να ορίσει έναν πριν
          καταχωρήσεις επισκέψεις.
        </p>
      )}

      <Card>
        <VisitForm
          action={createVisit}
          doctors={doctors ?? []}
          reps={manager ? (repsResult.data ?? []) : undefined}
          defaultDoctorId={doctorId}
          cycleId={cycle?.id}
          cycleName={cycle?.name}
        />
      </Card>
    </div>
  );
}
