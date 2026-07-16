"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

export async function createPharmacyVisit(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const manager = isManagerOrAdmin(profile.role);

  const cycleId = str(formData, "cycle_id");
  const pharmacyName = str(formData, "pharmacy_name");
  const notes = str(formData, "notes");
  const repId = (manager && str(formData, "rep_id")) || profile.id;

  if (!cycleId || !pharmacyName || !notes) {
    redirect(
      `/pharmacies/new?error=${encodeURIComponent("Συμπλήρωσε φαρμακείο, σημειώσεις και κύκλο.")}`,
    );
  }

  const { error } = await supabase.from("pharmacy_visits").insert({
    rep_id: repId,
    cycle_id: cycleId!,
    pharmacy_name: pharmacyName!,
    notes: notes!,
    visit_date: str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10),
    nearby_doctor_id: str(formData, "nearby_doctor_id"),
  });

  if (error) {
    redirect(`/pharmacies/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/pharmacies");
  revalidatePath("/dashboard");
  redirect("/pharmacies");
}

export async function updatePharmacyVisit(visitId: string, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const pharmacyName = str(formData, "pharmacy_name");
  const notes = str(formData, "notes");

  if (!pharmacyName || !notes) {
    redirect(
      `/pharmacies/${visitId}/edit?error=${encodeURIComponent("Συμπλήρωσε φαρμακείο και σημειώσεις.")}`,
    );
  }

  const { error } = await supabase
    .from("pharmacy_visits")
    .update({
      pharmacy_name: pharmacyName!,
      notes: notes!,
      visit_date: str(formData, "visit_date") ?? new Date().toISOString().slice(0, 10),
      nearby_doctor_id: str(formData, "nearby_doctor_id"),
    })
    .eq("id", visitId);

  if (error) {
    redirect(`/pharmacies/${visitId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/pharmacies");
  revalidatePath("/dashboard");
  redirect("/pharmacies");
}
