"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { getAssignableReps } from "@/lib/queries/reps";
import { countWorkdays, DAILY_VISIT_TARGET } from "@/lib/constants/schedule";
import { sendWeeklyReport } from "@/lib/reports/send-weekly-report";

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    redirect(`/cycles?error=${encodeURIComponent("Μόνο ο admin μπορεί να το κάνει αυτό.")}`);
  }
  return profile;
}

/**
 * Στόχος επισκέψεων = 5/ημέρα (σταθερό) × εργάσιμες ημέρες του κύκλου,
 * στόχος κάλυψης πάντα 100% — εφαρμόζεται σε όλους τους reps.
 */
async function applyDefaultTargets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cycleId: string,
  startDate: string,
  endDate: string,
  adminId: string,
) {
  const targetVisits = countWorkdays(startDate, endDate) * DAILY_VISIT_TARGET;
  const reps = await getAssignableReps(supabase);

  if (reps.length === 0) return;

  await supabase.from("cycle_targets").upsert(
    reps.map((rep) => ({
      rep_id: rep.id,
      cycle_id: cycleId,
      target_visits: targetVisits,
      target_coverage_pct: 100,
      set_by: adminId,
      set_at: new Date().toISOString(),
    })),
    { onConflict: "rep_id,cycle_id" },
  );
}

export async function recalculateTargets(cycleId: string) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("start_date, end_date")
    .eq("id", cycleId)
    .single();

  if (!cycle) {
    redirect(`/cycles?error=${encodeURIComponent("Ο κύκλος δεν βρέθηκε.")}`);
  }

  await applyDefaultTargets(supabase, cycleId, cycle.start_date, cycle.end_date, profile.id);

  revalidatePath("/cycles");
  revalidatePath("/dashboard");
}

export async function updateCycle(cycleId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = str(formData, "name");
  const startDate = str(formData, "start_date");
  const endDate = str(formData, "end_date");

  if (!name || !startDate || !endDate) {
    redirect(`/cycles?error=${encodeURIComponent("Συμπλήρωσε όλα τα πεδία του κύκλου.")}`);
  }

  const { error } = await supabase
    .from("cycles")
    .update({ name: name!, start_date: startDate!, end_date: endDate! })
    .eq("id", cycleId);

  if (error) {
    redirect(`/cycles?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/cycles");
  revalidatePath("/dashboard");
}

export async function createCycle(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const name = str(formData, "name");
  const startDate = str(formData, "start_date");
  const endDate = str(formData, "end_date");
  const activate = formData.get("activate") === "on";

  if (!name || !startDate || !endDate) {
    redirect(`/cycles?error=${encodeURIComponent("Συμπλήρωσε όλα τα πεδία του κύκλου.")}`);
  }

  if (activate) {
    await supabase.from("cycles").update({ is_active: false }).eq("is_active", true);
  }

  const { data: cycle, error } = await supabase
    .from("cycles")
    .insert({
      name: name!,
      start_date: startDate!,
      end_date: endDate!,
      is_active: activate,
    })
    .select("id")
    .single();

  if (error || !cycle) {
    redirect(`/cycles?error=${encodeURIComponent(error?.message ?? "Αποτυχία δημιουργίας")}`);
  }

  await applyDefaultTargets(supabase, cycle.id, startDate!, endDate!, profile.id);

  revalidatePath("/cycles");
  revalidatePath("/dashboard");
}

export async function setActiveCycle(cycleId: string) {
  await requireAdmin();
  const supabase = await createClient();

  await supabase.from("cycles").update({ is_active: false }).eq("is_active", true);
  const { error } = await supabase
    .from("cycles")
    .update({ is_active: true })
    .eq("id", cycleId);

  if (error) {
    redirect(`/cycles?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/cycles");
  revalidatePath("/dashboard");
}

export async function setCycleTarget(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const repId = str(formData, "rep_id");
  const cycleId = str(formData, "cycle_id");
  const targetVisits = Number(formData.get("target_visits") ?? 0) || 0;
  const targetCoveragePct = Number(formData.get("target_coverage_pct") ?? 0) || 0;

  if (!repId || !cycleId) {
    redirect(`/cycles?error=${encodeURIComponent("Λείπουν στοιχεία στόχου.")}`);
  }

  const { error } = await supabase.from("cycle_targets").upsert(
    {
      rep_id: repId!,
      cycle_id: cycleId!,
      target_visits: targetVisits,
      target_coverage_pct: targetCoveragePct,
      set_by: profile.id,
      set_at: new Date().toISOString(),
    },
    { onConflict: "rep_id,cycle_id" },
  );

  if (error) {
    redirect(`/cycles?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/cycles");
  revalidatePath("/dashboard");
}

export async function sendWeeklyReportNow() {
  await requireAdmin();
  const supabase = await createClient();

  let recipients: string[] | undefined;
  let errorMessage: string | undefined;
  try {
    ({ recipients } = await sendWeeklyReport(supabase));
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Αποτυχία αποστολής";
  }

  if (errorMessage) {
    redirect(`/cycles?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(`/cycles?sent=${encodeURIComponent(`Στάλθηκε στο: ${recipients!.join(", ")}`)}`);
}
