"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";

export interface PharmacySearchResult {
  id: string;
  name: string;
  city: string | null;
}

export async function searchPharmacies(query: string): Promise<PharmacySearchResult[]> {
  await requireProfile();
  if (!query.trim()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("pharmacies")
    .select("id, name, city")
    .ilike("name", `%${query.trim()}%`)
    .order("name")
    .limit(10);
  return data ?? [];
}

function revalidateDoctor(doctorId: string) {
  revalidatePath(`/doctors/${doctorId}`);
}

export async function linkExistingPharmacy(
  doctorId: string,
  pharmacyId: string,
): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("doctor_pharmacies")
    .insert({ doctor_id: doctorId, pharmacy_id: pharmacyId });
  if (error) return { error: error.message };
  revalidateDoctor(doctorId);
  return {};
}

export async function createAndLinkPharmacy(
  doctorId: string,
  name: string,
  city: string | null,
): Promise<{ error?: string }> {
  await requireProfile();
  if (!name.trim()) return { error: "Απαιτείται όνομα φαρμακείου." };
  const supabase = await createClient();

  const { data: pharmacy, error: insertError } = await supabase
    .from("pharmacies")
    .insert({ name: name.trim(), city: city?.trim() || null })
    .select("id")
    .single();
  if (insertError || !pharmacy) return { error: insertError?.message ?? "Αποτυχία δημιουργίας." };

  const { error: linkError } = await supabase
    .from("doctor_pharmacies")
    .insert({ doctor_id: doctorId, pharmacy_id: pharmacy.id });
  if (linkError) return { error: linkError.message };

  revalidateDoctor(doctorId);
  return {};
}

export async function unlinkPharmacy(
  doctorId: string,
  linkId: string,
): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("doctor_pharmacies").delete().eq("id", linkId);
  if (error) return { error: error.message };
  revalidateDoctor(doctorId);
  return {};
}

/** Υποβιβάζει τυχόν υπάρχον primary του γιατρού πριν προάγει το νέο —
 * αποφεύγει το unique index (το πολύ ένα primary ανά γιατρό). */
export async function setPrimaryPharmacy(
  doctorId: string,
  linkId: string,
): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { error: demoteError } = await supabase
    .from("doctor_pharmacies")
    .update({ role: "secondary" })
    .eq("doctor_id", doctorId)
    .eq("role", "primary");
  if (demoteError) return { error: demoteError.message };

  const { error: promoteError } = await supabase
    .from("doctor_pharmacies")
    .update({ role: "primary" })
    .eq("id", linkId);
  if (promoteError) return { error: promoteError.message };

  revalidateDoctor(doctorId);
  return {};
}
