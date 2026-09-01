import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { formatDateGR } from "@/lib/constants/schedule";
import { cancelVisit } from "./actions";

const STATUS_TONE = {
  planned: "neutral",
  completed: "success",
  cancelled: "danger",
} as const;

const STATUS_LABEL = {
  planned: "Προγραμματισμένη",
  completed: "Ολοκληρωμένη",
  cancelled: "Ακυρωμένη",
} as const;

export default async function VisitsPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: visits } = await supabase
    .from("visits")
    .select(
      "*, doctors!visits_doctor_id_fkey(last_name, first_name), institutions(name), profiles!visits_rep_id_fkey(full_name)",
    )
    .order("scheduled_date", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-primary-dark">Επισκέψεις</h1>
        <div className="flex gap-2">
          <Link href="/visits/calendar">
            <Button variant="secondary" size="md">
              Ημερολόγιο
            </Button>
          </Link>
          <Link href="/visits/new">
            <Button size="md">+ Νέα επίσκεψη</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {visits?.length === 0 && (
          <p className="py-8 text-center text-sm text-ink/50">
            Δεν υπάρχουν επισκέψεις ακόμα.
          </p>
        )}
        {visits?.map((visit) => (
          <div
            key={visit.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm hover:border-primary/30"
          >
            <Link
              href={visit.doctor_id ? `/doctors/${visit.doctor_id}` : "/hospitals"}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-sm font-semibold text-ink">
                {visit.doctors
                  ? formatDoctorName(visit.doctors.last_name, visit.doctors.first_name)
                  : visit.institutions
                    ? `🏥 ${visit.institutions.name}`
                    : "—"}
              </p>
              <p className="truncate text-xs text-ink/50">
                {visit.profiles?.full_name} ·{" "}
                {visit.scheduled_date || visit.completed_date
                  ? formatDateGR(visit.scheduled_date ?? visit.completed_date!)
                  : "—"}{" "}
                ·{" "}
                {visit.visit_type === "joint" ? "Κοινή επίσκεψη" : "Κανονική"}
              </p>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <Badge tone={STATUS_TONE[visit.status]}>
                {STATUS_LABEL[visit.status]}
              </Badge>
              <Link
                href={`/visits/${visit.id}/edit`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Επεξεργασία
              </Link>
              {visit.status === "planned" && (
                <form action={cancelVisit.bind(null, visit.id)}>
                  <button
                    type="submit"
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Ακύρωση
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
