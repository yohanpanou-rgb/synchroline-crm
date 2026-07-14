import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import {
  getActiveCycle,
  getRepMetrics,
  getAllRepsMetrics,
  type RepMetrics,
} from "@/lib/queries/dashboard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PacingBar } from "@/components/dashboard/PacingBar";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-medium text-ink/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-primary-dark">
        {value}
      </p>
    </Card>
  );
}

function RepRow({ metrics }: { metrics: RepMetrics }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {metrics.repName}
        </p>
        <p className="text-xs text-ink/50">
          {metrics.coveredCount}/{metrics.territorySize} γιατροί ·{" "}
          {metrics.visitsCompleted} επισκέψεις
        </p>
      </div>
      <Badge
        tone={
          metrics.coveragePct >= metrics.targetCoveragePct
            ? "success"
            : metrics.coveragePct >= metrics.targetCoveragePct * 0.8
              ? "warning"
              : "danger"
        }
      >
        {metrics.coveragePct.toFixed(0)}% / στόχος {metrics.targetCoveragePct.toFixed(0)}%
      </Badge>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const cycle = await getActiveCycle(supabase);

  if (isManagerOrAdmin(profile.role)) {
    const repsMetrics = await getAllRepsMetrics(supabase, cycle);
    const totalDoctors = repsMetrics.reduce((s, r) => s + r.territorySize, 0);
    const totalVisits = repsMetrics.reduce((s, r) => s + r.visitsCompleted, 0);
    const avgCoverage =
      repsMetrics.length > 0
        ? repsMetrics.reduce((s, r) => s + r.coveragePct, 0) / repsMetrics.length
        : 0;

    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-xl font-semibold text-primary-dark">
          Dashboard — Ομάδα
        </h1>
        <p className="mb-6 text-sm text-ink/50">
          {cycle ? cycle.name : "Δεν υπάρχει ενεργός κύκλος"}
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="Σύνολο γιατρών" value={String(totalDoctors)} />
          <StatCard
            label="Ολοκληρωμένες επισκέψεις"
            value={String(totalVisits)}
          />
          <StatCard label="Μ.Ο. κάλυψης" value={`${avgCoverage.toFixed(0)}%`} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Κάλυψη ανά rep</CardTitle>
          </CardHeader>
          <div className="divide-y divide-black/5">
            {repsMetrics.length === 0 && (
              <p className="py-4 text-sm text-ink/50">Δεν υπάρχουν reps.</p>
            )}
            {repsMetrics.map((m) => (
              <RepRow key={m.repId} metrics={m} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const metrics = await getRepMetrics(supabase, profile.id, profile.full_name, cycle);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-primary-dark">
        Καλησπέρα, {profile.full_name.split(" ")[0]}
      </h1>
      <p className="mb-6 text-sm text-ink/50">
        {cycle ? cycle.name : "Δεν υπάρχει ενεργός κύκλος"}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          label="Γιατροί πελατολογίου"
          value={String(metrics.territorySize)}
        />
        <StatCard
          label="Ολοκληρωμένες επισκέψεις"
          value={String(metrics.visitsCompleted)}
        />
        <StatCard
          label="Προγραμματισμένες"
          value={String(metrics.visitsPlanned)}
        />
        <StatCard label="Στόχος επισκέψεων" value={String(metrics.targetVisits)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pacing κύκλου</CardTitle>
        </CardHeader>
        {cycle ? (
          <PacingBar
            label="Κάλυψη πελατολογίου"
            subtitle={`${metrics.coveredCount} / ${metrics.territorySize} γιατροί`}
            cycleStartDate={cycle.start_date}
            cycleEndDate={cycle.end_date}
            actualCoveragePct={metrics.coveragePct}
            targetCoveragePct={metrics.targetCoveragePct}
          />
        ) : (
          <p className="text-sm text-ink/50">
            Δεν έχει οριστεί ενεργός κύκλος από τον admin.
          </p>
        )}
      </Card>
    </div>
  );
}
