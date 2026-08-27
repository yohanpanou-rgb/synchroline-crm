import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { DoctorForm } from "@/components/doctors/DoctorForm";
import { RatingCpoControl } from "@/components/doctors/RatingCpoControl";
import { DoctorPharmaciesBlock } from "@/components/doctors/DoctorPharmaciesBlock";
import { ActivityHistory } from "@/components/audit/ActivityHistory";
import { getRecordHistory } from "@/lib/queries/audit";
import { getDoctorPharmacies } from "@/lib/queries/doctor-pharmacies";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { DeleteDoctorButton } from "@/components/doctors/DeleteDoctorButton";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { formatDateGR } from "@/lib/constants/schedule";
import { updateDoctor } from "../actions";
import { getAssignableReps } from "@/lib/queries/reps";
import { getInstitutionsList } from "@/lib/queries/institutions";

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

  const completedDates = (visits ?? [])
    .filter((v) => v.status === "completed")
    .map((v) => v.completed_date ?? v.scheduled_date)
    .filter((d): d is string => !!d)
    .sort((a, b) => (a < b ? 1 : -1)); // desc

  let daysSinceLastVisit: number | null = null;
  let avgIntervalDays: number | null = null;
  const [firstCompletedDate] = completedDates;
  if (firstCompletedDate) {
    daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(firstCompletedDate).getTime()) / 86_400_000,
    );
  }
  if (completedDates.length > 1) {
    const gaps: number[] = [];
    for (let i = 0; i < completedDates.length - 1; i++) {
      const a = completedDates[i];
      const b = completedDates[i + 1];
      if (!a || !b) continue;
      const gap = (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
      gaps.push(gap);
    }
    avgIntervalDays = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
  }

  const reps = await getAssignableReps(supabase);
  const institutions = await getInstitutionsList(supabase);
  const history = manager ? await getRecordHistory(supabase, "doctors", id) : [];
  const pharmacyLinks = await getDoctorPharmacies(supabase, id);

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton fallbackHref="/doctors" />
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-primary-dark">
            {formatDoctorName(doctor.last_name, doctor.first_name)}
          </h1>
          <div className="mt-1.5 flex gap-2">
            <Badge tone={STATUS_TONE[doctor.status]}>
              {STATUS_LABEL[doctor.status]}
            </Badge>
            {doctor.is_candela_client && (
              <Badge tone="neutral">Πελάτης Candela</Badge>
            )}
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
        <DoctorPharmaciesBlock doctorId={doctor.id} initialLinks={pharmacyLinks} />
      </Card>

      <Card className="mb-4">
        <DoctorForm
          action={updateDoctor.bind(null, doctor.id)}
          isManager={manager}
          doctor={doctor}
          reps={reps}
          institutions={institutions}
          submitLabel="Αποθήκευση"
        />
      </Card>

      {(daysSinceLastVisit !== null || avgIntervalDays !== null) && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {daysSinceLastVisit !== null && (
            <Card>
              <p className="text-xs font-medium text-ink/50">Τελευταία επίσκεψη</p>
              <p className="mt-1 text-lg font-semibold text-primary-dark">
                {daysSinceLastVisit === 0 ? "Σήμερα" : `πριν ${daysSinceLastVisit} μέρες`}
              </p>
            </Card>
          )}
          {avgIntervalDays !== null && (
            <Card>
              <p className="text-xs font-medium text-ink/50">Μέση συχνότητα</p>
              <p className="mt-1 text-lg font-semibold text-primary-dark">
                κάθε {avgIntervalDays} μέρες
              </p>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ιστορικό</CardTitle>
        </CardHeader>
        <div className="divide-y divide-black/5">
          {(!visits || visits.length === 0) && history.length === 0 && (
            <p className="py-4 text-sm text-ink/50">Καμία δραστηριότητα ακόμα.</p>
          )}
          {visits?.map((visit) => (
            <div key={`visit-${visit.id}`} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                </span>
                <span className="text-sm text-ink">
                  {visit.scheduled_date || visit.completed_date
                    ? formatDateGR(visit.scheduled_date ?? visit.completed_date!)
                    : "—"}
                </span>
              </div>
              <Badge tone={visit.status === "completed" ? "success" : "neutral"}>
                {VISIT_STATUS_LABEL[visit.status]}
              </Badge>
            </div>
          ))}
        </div>
        {manager && history.length > 0 && (
          <>
            <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
              Αλλαγές στοιχείων
            </p>
            <ActivityHistory entries={history} />
          </>
        )}
      </Card>

      {manager && (
        <div className="mt-4 flex justify-end">
          <DeleteDoctorButton
            doctorId={doctor.id}
            doctorName={formatDoctorName(doctor.last_name, doctor.first_name)}
          />
        </div>
      )}
    </div>
  );
}
