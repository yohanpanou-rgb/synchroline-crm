"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { normalizeDoctorName } from "@/lib/utils/name-normalization";
import type {
  DoctorStatus,
  DynamicCategory,
  PriorityColor,
} from "@/lib/types/database.types";

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

const num = (formData: FormData, key: string) => {
  const v = str(formData, key);
  return v === null ? null : Number(v);
};

/**
 * Ensures doctors.current_rep_id changes are reflected in
 * territory_assignments (closes the previous open assignment, opens a new one).
 */
async function syncTerritoryAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string,
  newRepId: string | null,
  actorId: string,
) {
  const { data: openAssignment } = await supabase
    .from("territory_assignments")
    .select("id, rep_id")
    .eq("doctor_id", doctorId)
    .is("valid_to", null)
    .maybeSingle();

  if (openAssignment?.rep_id === newRepId) return;

  const today = new Date().toISOString().slice(0, 10);

  if (openAssignment) {
    await supabase
      .from("territory_assignments")
      .update({ valid_to: today })
      .eq("id", openAssignment.id);
  }

  if (newRepId) {
    await supabase.from("territory_assignments").insert({
      doctor_id: doctorId,
      rep_id: newRepId,
      valid_from: today,
      created_by: actorId,
    });
  }
}

export async function createDoctor(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const manager = isManagerOrAdmin(profile.role);

  const fullNameRaw = str(formData, "full_name_raw") ?? "";
  const { lastName, firstName } = normalizeDoctorName(fullNameRaw);

  const brickCode = manager ? str(formData, "brick_code") : null;
  const brickName = manager ? str(formData, "brick_name") : null;
  if (brickCode) {
    await supabase.from("bricks").upsert({ code: brickCode, name: brickName });
  }

  const currentRepId = manager ? str(formData, "current_rep_id") : profile.id;
  const status: DoctorStatus = manager
    ? ((str(formData, "status") as DoctorStatus) ?? "pending_approval")
    : "pending_approval";

  const { data: doctor, error } = await supabase
    .from("doctors")
    .insert({
      full_name_raw: fullNameRaw,
      last_name: lastName,
      first_name: firstName,
      region: str(formData, "region"),
      county: str(formData, "county"),
      brick_code: brickCode,
      dynamic_category: str(formData, "dynamic_category") as DynamicCategory | null,
      priority_color: str(formData, "priority_color") as PriorityColor | null,
      pharmacy_1: str(formData, "pharmacy_1"),
      pharmacy_2: str(formData, "pharmacy_2"),
      budget_2025: num(formData, "budget_2025"),
      budget_2026: num(formData, "budget_2026"),
      disbursed_2025: num(formData, "disbursed_2025"),
      disbursed_2026: num(formData, "disbursed_2026"),
      incentive_2025: num(formData, "incentive_2025"),
      incentive_2026: num(formData, "incentive_2026"),
      weekly_rx_aknicare: num(formData, "weekly_rx_aknicare"),
      weekly_rx_closebax: num(formData, "weekly_rx_closebax"),
      weekly_rx_terproline: num(formData, "weekly_rx_terproline"),
      weekly_rx_rosacure: num(formData, "weekly_rx_rosacure"),
      current_rep_id: currentRepId,
      status,
    })
    .select("id")
    .single();

  if (error || !doctor) {
    redirect(
      `/doctors/new?error=${encodeURIComponent(error?.message ?? "Αποτυχία δημιουργίας")}`,
    );
  }

  if (manager && currentRepId) {
    await syncTerritoryAssignment(supabase, doctor.id, currentRepId, profile.id);
  }

  revalidatePath("/doctors");
  redirect(`/doctors/${doctor.id}`);
}

export async function updateDoctor(doctorId: string, formData: FormData) {
  const profile = await requireProfile();
  if (!isManagerOrAdmin(profile.role)) {
    redirect(`/doctors/${doctorId}?error=${encodeURIComponent("Μη επιτρεπτή ενέργεια")}`);
  }
  const supabase = await createClient();

  const fullNameRaw = str(formData, "full_name_raw") ?? "";
  const { lastName, firstName } = normalizeDoctorName(fullNameRaw);

  const brickCode = str(formData, "brick_code");
  const brickName = str(formData, "brick_name");
  if (brickCode) {
    await supabase.from("bricks").upsert({ code: brickCode, name: brickName });
  }

  const currentRepId = str(formData, "current_rep_id");

  const { error } = await supabase
    .from("doctors")
    .update({
      full_name_raw: fullNameRaw,
      last_name: lastName,
      first_name: firstName,
      region: str(formData, "region"),
      county: str(formData, "county"),
      brick_code: brickCode,
      dynamic_category: str(formData, "dynamic_category") as DynamicCategory | null,
      priority_color: str(formData, "priority_color") as PriorityColor | null,
      pharmacy_1: str(formData, "pharmacy_1"),
      pharmacy_2: str(formData, "pharmacy_2"),
      budget_2025: num(formData, "budget_2025"),
      budget_2026: num(formData, "budget_2026"),
      disbursed_2025: num(formData, "disbursed_2025"),
      disbursed_2026: num(formData, "disbursed_2026"),
      incentive_2025: num(formData, "incentive_2025"),
      incentive_2026: num(formData, "incentive_2026"),
      weekly_rx_aknicare: num(formData, "weekly_rx_aknicare"),
      weekly_rx_closebax: num(formData, "weekly_rx_closebax"),
      weekly_rx_terproline: num(formData, "weekly_rx_terproline"),
      weekly_rx_rosacure: num(formData, "weekly_rx_rosacure"),
      current_rep_id: currentRepId,
      status: (str(formData, "status") as DoctorStatus) ?? "active",
    })
    .eq("id", doctorId);

  if (error) {
    redirect(`/doctors/${doctorId}?error=${encodeURIComponent(error.message)}`);
  }

  await syncTerritoryAssignment(supabase, doctorId, currentRepId, profile.id);

  revalidatePath("/doctors");
  revalidatePath(`/doctors/${doctorId}`);
  redirect(`/doctors/${doctorId}`);
}
