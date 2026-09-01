import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { getActiveCycle } from "@/lib/queries/dashboard";
import { getDataEntryQuality, getCompetitorMentionStats, getHospitalCoverageReport } from "@/lib/queries/reports";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HospitalCoverageAccordion } from "@/components/reports/HospitalCoverageAccordion";

export default async function ReportsPage() {
  const profile = await requireProfile();
  if (profile.role === "rep") redirect("/dashboard");

  const supabase = await createClient();
  const cycle = await getActiveCycle(supabase);

  const [dataQuality, competitorReport, hospitalCoverage] = await Promise.all([
    getDataEntryQuality(supabase, cycle),
    getCompetitorMentionStats(supabase, cycle),
    getHospitalCoverageReport(supabase, cycle),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-primary-dark">Αναφορές</h1>
      <p className="mb-6 text-sm text-ink/50">
        {cycle ? `Τρέχων κύκλος: ${cycle.name}` : "Δεν υπάρχει ενεργός κύκλος."}
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ποιότητα καταχωρήσεων ανά rep</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                <th className="py-2 pr-3 font-medium">Rep</th>
                <th className="py-2 pr-3 font-medium">Ολοκλ. επισκέψεις</th>
                <th className="py-2 pr-3 font-medium">Με σημειώσεις</th>
                <th className="py-2 pr-3 font-medium">Με στοιχεία ανταγωνισμού</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {dataQuality.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-sm text-ink/50">Δεν υπάρχουν δεδομένα.</td>
                </tr>
              )}
              {dataQuality.map((r) => (
                <tr key={r.repId}>
                  <td className="py-2.5 pr-3 font-medium text-ink">{r.repName}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink/70">{r.completedVisits}</td>
                  <td className="py-2.5 pr-3">
                    <Badge tone={r.withNotesPct < 50 ? "danger" : r.withNotesPct < 80 ? "warning" : "success"}>
                      {r.withNotesCount} ({r.withNotesPct.toFixed(0)}%)
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge tone="neutral">
                      {r.withCompetitorDataCount} ({r.withCompetitorDataPct.toFixed(0)}%)
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ανταγωνιστικά brands ανά κατηγορία πάθησης</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                <th className="py-2 pr-3 font-medium">Κατηγορία</th>
                <th className="py-2 pr-3 font-medium">Brand</th>
                <th className="py-2 pr-3 font-medium">Αναφορές</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {competitorReport.byBrand.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-sm text-ink/50">Καμία καταχώρηση ανταγωνισμού ακόμα.</td>
                </tr>
              )}
              {competitorReport.byBrand.map((b) => (
                <tr key={`${b.category}-${b.competitorName}`}>
                  <td className="py-2.5 pr-3 text-ink/70">{b.category}</td>
                  <td className="py-2.5 pr-3 font-medium text-ink">{b.competitorName}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink/70">{b.mentions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {competitorReport.byRep.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink/40">
              Αναφορές ανταγωνισμού ανά rep
            </p>
            <div className="flex flex-wrap gap-2">
              {competitorReport.byRep.map((r) => (
                <Badge key={r.repId} tone="neutral">
                  {r.repName}: {r.mentions}
                </Badge>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Κάλυψη Νοσοκομείων</CardTitle>
        </CardHeader>
        <HospitalCoverageAccordion entries={hospitalCoverage} />
      </Card>
    </div>
  );
}
