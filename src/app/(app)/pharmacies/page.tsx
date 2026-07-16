import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getAssignableReps } from "@/lib/queries/reps";
import {
  getWeekPharmacyVisitCount,
  getAllRepsPharmacyMetrics,
} from "@/lib/queries/pharmacies";
import { WEEKLY_PHARMACY_VISIT_TARGET } from "@/lib/constants/schedule";
import { formatDateGR } from "@/lib/constants/schedule";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

export default async function PharmaciesPage() {
  const profile = await requireProfile();
  const manager = isManagerOrAdmin(profile.role);
  const supabase = await createClient();

  const { data: visits } = await supabase
    .from("pharmacy_visits")
    .select("*, doctors(last_name, first_name), profiles!pharmacy_visits_rep_id_fkey(full_name)")
    .order("visit_date", { ascending: false })
    .limit(50);

  let progressCard: React.ReactNode;
  if (manager) {
    const reps = await getAssignableReps(supabase);
    const metrics = await getAllRepsPharmacyMetrics(supabase, reps);
    progressCard = (
      <Card>
        <CardHeader>
          <CardTitle>Εβδομαδιαία πρόοδος — στόχος {WEEKLY_PHARMACY_VISIT_TARGET}/rep</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {metrics.map((m) => (
            <div key={m.repId}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-ink">{m.repName}</span>
                <span className="tabular-nums text-ink/50">
                  {m.count}/{WEEKLY_PHARMACY_VISIT_TARGET}
                </span>
              </div>
              <ProgressBar
                value={(m.count / WEEKLY_PHARMACY_VISIT_TARGET) * 100}
                colorClassName={m.count >= WEEKLY_PHARMACY_VISIT_TARGET ? "bg-success" : "bg-primary"}
              />
            </div>
          ))}
        </div>
      </Card>
    );
  } else {
    const count = await getWeekPharmacyVisitCount(supabase, profile.id);
    progressCard = (
      <Card>
        <CardHeader>
          <CardTitle>Εβδομαδιαία πρόοδος</CardTitle>
        </CardHeader>
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-ink/50">Αυτή την εβδομάδα</span>
          <span className="tabular-nums font-medium text-ink">
            {count}/{WEEKLY_PHARMACY_VISIT_TARGET}
          </span>
        </div>
        <ProgressBar
          value={(count / WEEKLY_PHARMACY_VISIT_TARGET) * 100}
          colorClassName={count >= WEEKLY_PHARMACY_VISIT_TARGET ? "bg-success" : "bg-primary"}
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-primary-dark">Φαρμακεία</h1>
        <Link href="/pharmacies/new">
          <Button size="md">+ Νέα επίσκεψη</Button>
        </Link>
      </div>

      {progressCard}

      <Card>
        <CardHeader>
          <CardTitle>Πρόσφατες επισκέψεις</CardTitle>
        </CardHeader>
        <div className="divide-y divide-black/5">
          {visits?.length === 0 && (
            <p className="py-4 text-sm text-ink/50">Δεν υπάρχουν επισκέψεις ακόμα.</p>
          )}
          {visits?.map((visit) => (
            <Link
              key={visit.id}
              href={`/pharmacies/${visit.id}/edit`}
              className="block py-3 hover:bg-black/[0.02]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{visit.pharmacy_name}</p>
                <p className="text-xs tabular-nums text-ink/50">
                  {formatDateGR(visit.visit_date)}
                </p>
              </div>
              <p className="mt-0.5 truncate text-xs text-ink/50">
                {visit.profiles?.full_name}
                {visit.doctors
                  ? ` · κοντά σε ${formatDoctorName(visit.doctors.last_name, visit.doctors.first_name)}`
                  : ""}
              </p>
              {visit.notes && (
                <p className="mt-1 truncate text-xs text-ink/70">{visit.notes}</p>
              )}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
