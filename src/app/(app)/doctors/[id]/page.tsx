import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { DoctorForm } from "@/components/doctors/DoctorForm";
import { DoctorDetailView } from "@/components/doctors/DoctorDetailView";
import { RatingCpoControl } from "@/components/doctors/RatingCpoControl";
import { ActivityHistory } from "@/components/audit/ActivityHistory";
import { getRecordHistory } from "@/lib/queries/audit";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { formatDateGR } from "@/lib/constants/schedule";
import { updateDoctor } from "../actions";
import { getAssignableReps } from "@/lib/queries/reps";

const STATUS_TONE = {
  active: "success",
  pending_approval: "warning",
  archived: "neutral",
} as const;

const STATUS_LABEL = {
  active: "Ενεργός",
  pending_approval: "Εκκρεμεί έγκριση",
  archived: "Αρχειοθετημένος",
} as const;

const VISIT_STATUS_LABEL = {
  planned: "Προγραμματισμένη",
  completed: "Ολοκληρωμένη",
  cancelled: "Ακυρωμένη",
} as const;

export default async function DoctorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const { error } = await searchParams;
  const manager = isManagerOrAdmin(profile.role);
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!doctor) notFound();

  const { data: visits } = await supabase
    .from("visits")
    .select("*")
    .eq("doctor_id", id)
    .order("scheduled_date", { ascending: false })
    .limit(10);

  const reps = manager ? await getAssignableReps(supabase) : [];
  const history = manager ? await getRecordHistory(supabase, "doctors", id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-primary-dark">
            {formatDoctorName(doctor.last_name, doctor.first_name)}
          </h1>
          <div className="mt-1.5 flex gap-2">
            <Badge tone={STATUS_TONE[doctor.status]}>
              {STATUS_LABEL[doctor.status]}
            </Badge>
          </div>
        </div>
        <Link href={`/visits/new?doctorId=${doctor.id}`}>
          <Button size="md">+ Επίσκεψη</Button>
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card className="mb-4">
        <RatingCpoControl doctorId={doctor.id} initialValue={doctor.rating_cpo} />
      </Card>

      <Card className="mb-4">
        {manager ? (
          <DoctorForm
            action={updateDoctor.bind(null, doctor.id)}
            isManager
            doctor={doctor}
            reps={reps}
            submitLabel="Αποθήκευση"
          />
        ) : (
          <DoctorDetailView doctor={doctor} />
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Πρόσφατες επισκέψεις</CardTitle>
        </CardHeader>
        <div className="divide-y divide-black/5">
          {(!visits || visits.length === 0) && (
            <p className="py-4 text-sm text-ink/50">Καμία επίσκεψη ακόμα.</p>
          )}
          {visits?.map((visit) => (
            <div key={visit.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-ink">
                {visit.scheduled_date || visit.completed_date
                  ? formatDateGR(visit.scheduled_date ?? visit.completed_date!)
                  : "—"}
              </span>
              <Badge tone={visit.status === "completed" ? "success" : "neutral"}>
                {VISIT_STATUS_LABEL[visit.status]}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {manager && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Ιστορικό αλλαγών</CardTitle>
          </CardHeader>
          <ActivityHistory entries={history} />
        </Card>
      )}
    </div>
  );
}
