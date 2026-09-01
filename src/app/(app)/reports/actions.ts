"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { getActiveCycle } from "@/lib/queries/dashboard";
import { getDataEntryQuality, getCompetitorMentionStats, getHospitalCoverageReport } from "@/lib/queries/reports";
import { generateReportInsights } from "@/lib/ai/insights";

export async function generateAiInsights(): Promise<{ text?: string; error?: string }> {
  const profile = await requireProfile();
  if (profile.role === "rep") return { error: "Μη επιτρεπτή ενέργεια." };

  const supabase = await createClient();
  const cycle = await getActiveCycle(supabase);

  const [dataQuality, competitorReport, hospitalCoverage] = await Promise.all([
    getDataEntryQuality(supabase, cycle),
    getCompetitorMentionStats(supabase, cycle),
    getHospitalCoverageReport(supabase, cycle),
  ]);

  try {
    const text = await generateReportInsights({
      cycleName: cycle?.name ?? null,
      dataQuality,
      competitorReport,
      hospitalCoverage,
    });
    return { text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Αποτυχία δημιουργίας σύνοψης." };
  }
}
