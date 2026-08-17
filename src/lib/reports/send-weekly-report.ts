import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getWeeklyReportData } from "./weekly-report";
import { renderWeeklyReportHtml } from "./weekly-report-email";

export async function sendWeeklyReport(
  supabase: SupabaseClient<Database>,
  anchor?: Date,
): Promise<{ recipients: string[] }> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipientsEnv = process.env.WEEKLY_REPORT_RECIPIENTS;

  if (!apiKey) throw new Error("RESEND_API_KEY δεν έχει οριστεί.");
  if (!recipientsEnv) throw new Error("WEEKLY_REPORT_RECIPIENTS δεν έχει οριστεί.");

  const recipients = recipientsEnv.split(",").map((s) => s.trim()).filter(Boolean);
  if (recipients.length === 0) throw new Error("WEEKLY_REPORT_RECIPIENTS είναι κενό.");

  const data = await getWeeklyReportData(supabase, anchor);
  const html = renderWeeklyReportHtml(data);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.WEEKLY_REPORT_FROM_EMAIL || "Synchroline CRM <onboarding@resend.dev>",
    to: recipients,
    subject: `Synchroline — Εβδομαδιαία αναφορά ${data.weekStart} – ${data.weekEnd}`,
    html,
  });

  if (error) throw new Error(error.message);

  return { recipients };
}
