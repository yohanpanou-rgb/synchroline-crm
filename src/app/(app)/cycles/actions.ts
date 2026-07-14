"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";

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

  const { error } = await supabase.from("cycles").insert({
    name: name!,
    start_date: startDate!,
    end_date: endDate!,
    is_active: activate,
  });

  if (error) {
    redirect(`/cycles?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/cycles");
  revalidatePath("/dashboard");
  void profile;
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
