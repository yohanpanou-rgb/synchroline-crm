import Anthropic from "@anthropic-ai/sdk";
import type { RepDataEntryQuality, CompetitorReport, HospitalCoverageEntry } from "@/lib/queries/reports";

export interface ReportInsightsInput {
  cycleName: string | null;
  dataQuality: RepDataEntryQuality[];
  competitorReport: CompetitorReport;
  hospitalCoverage: HospitalCoverageEntry[];
}

function buildPrompt(input: ReportInsightsInput): string {
  const { cycleName, dataQuality, competitorReport, hospitalCoverage } = input;

  const dataQualityLines = dataQuality
    .map(
      (r) =>
        `- ${r.repName}: ${r.completedVisits} ολοκληρωμένες επισκέψεις, ${r.withNotesPct.toFixed(0)}% με σημειώσεις, ${r.withCompetitorDataPct.toFixed(0)}% με στοιχεία ανταγωνισμού`,
    )
    .join("\n");

  const brandLines = competitorReport.byBrand
    .slice(0, 15)
    .map((b) => `- ${b.category} / ${b.competitorName}: ${b.mentions} αναφορές`)
    .join("\n");

  const hospitalLines = hospitalCoverage
    .map(
      (h) =>
        `- ${h.name}: ${h.coveredDoctors.length}/${h.doctorCount} γιατροί καλύφθηκαν, ${h.visitsThisCycle} επισκέψεις (${h.byRep.map((r) => `${r.repName}: ${r.count}`).join(", ") || "καμία"})`,
    )
    .join("\n");

  return `Είσαι αναλυτής πωλήσεων για μια φαρμακευτική εταιρεία (δερματολογικά προϊόντα). Παρακάτω είναι δεδομένα από τον τρέχοντα κύκλο επισκέψεων ιατρικών επισκεπτών (reps). Γράψε μια σύντομη, πρακτική σύνοψη στα Ελληνικά (μέγιστο 250 λέξεις) για τον manager: επισήμανε (1) ποιοι reps έχουν αδύναμη ποιότητα καταχώρησης, (2) τυχόν αξιοσημείωτες τάσεις ανταγωνισμού ανά κατηγορία πάθησης, (3) ποια νοσοκομεία υστερούν σε κάλυψη. Μην επαναλαμβάνεις απλά τους αριθμούς — δώσε συμπεράσματα και προτάσεις δράσης. Χρησιμοποίησε bullet points.

Κύκλος: ${cycleName ?? "—"}

Ποιότητα καταχωρήσεων ανά rep:
${dataQualityLines || "(καμία δεδομένα)"}

Ανταγωνιστικά brands (κατηγορία / brand: αναφορές):
${brandLines || "(καμία καταχώρηση ανταγωνισμού)"}

Κάλυψη νοσοκομείων:
${hospitalLines || "(κανένα νοσοκομείο)"}`;
}

export async function generateReportInsights(input: ReportInsightsInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY δεν έχει ρυθμιστεί.");
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(input) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
