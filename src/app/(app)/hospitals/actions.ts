"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { formatDoctorName } from "@/lib/utils/name-normalization";

export interface DoctorSearchResult {
  id: string;
  name: string;
  region: string | null;
}

export async function createInstitution(name: string): Promise<{ error?: string }> {
  await requireProfile();
  if (!name.trim()) return { error: "Απαιτείται όνομα νοσοκομείου." };

  const supabase = await createClient();
  const { error } = await supabase.from("institutions").insert({ name: name.trim() });
  if (error) return { error: error.message };

  revalidatePath("/hospitals");
  return {};
}

/** Γιατροί που δεν ανήκουν ήδη σε κάποιο νοσοκομείο — υποψήφιοι για ανάθεση. */
export async function searchAssignableDoctors(query: string): Promise<DoctorSearchResult[]> {
  await requireProfile();
  if (!query.trim()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("doctors")
    .select("id, last_name, first_name, region")
    .is("institution", null)
    .or(`last_name.ilike.%${query.trim()}%,first_name.ilike.%${query.trim()}%`)
    .limit(10);

  return (data ?? []).map((d) => ({
    id: d.id,
    name: formatDoctorName(d.last_name, d.first_name),
    region: d.region,
  }));
}

/**
 * Ανάθεση γιατρού σε νοσοκομείο. Μόνο σε ΚΟΙΝΟΧΡΗΣΤΟ νοσοκομείο (π.χ. Σύγγρος
 * — is_shared) αφαιρείται από το προσωπικό πελατολόγιο (current_rep_id).
 * Στα υπόλοιπα το "Νοσοκομείο" είναι απλώς ετικέτα χώρου εργασίας — ο
 * γιατρός παραμένει στον ίδιο rep (feedback Σάββα: η γενίκευση σε
 * "Νοσοκομεία" έκανε λάθος όλα κοινόχρηστα).
 */
export async function assignDoctorToInstitution(
  doctorId: string,
  institution: string,
): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { data: inst } = await supabase
    .from("institutions")
    .select("is_shared")
    .eq("name", institution)
    .maybeSingle();
  const isShared = inst?.is_shared ?? false;

  const { error } = await supabase
    .from("doctors")
    .update(isShared ? { institution, current_rep_id: null } : { institution })
    .eq("id", doctorId);
  if (error) return { error: error.message };

  if (isShared) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: openAssignment } = await supabase
      .from("territory_assignments")
      .select("id")
      .eq("doctor_id", doctorId)
      .is("valid_to", null)
      .maybeSingle();
    if (openAssignment) {
      await supabase.from("territory_assignments").update({ valid_to: today }).eq("id", openAssignment.id);
    }
  }

  revalidatePath("/hospitals");
  revalidatePath(`/doctors/${doctorId}`);
  revalidatePath("/doctors");
  return {};
}

/**
 * Αφαιρεί γιατρό από νοσοκομείο. Αν ήταν κοινόχρηστο (current_rep_id ήταν
 * ήδη null), ξαναγίνεται προσωπικό πελατολόγιο ανατιθέμενος σε όποιον rep
 * έκανε την αφαίρεση. Αν δεν ήταν κοινόχρηστο, ο υπεύθυνος rep δεν άλλαζε
 * ποτέ — απλώς αφαιρείται η ετικέτα.
 */
export async function removeDoctorFromInstitution(doctorId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("current_rep_id")
    .eq("id", doctorId)
    .maybeSingle();
  const wasUnowned = !doctor?.current_rep_id;

  const { error } = await supabase
    .from("doctors")
    .update(wasUnowned ? { institution: null, current_rep_id: profile.id } : { institution: null })
    .eq("id", doctorId);
  if (error) return { error: error.message };

  if (wasUnowned) {
    await supabase.from("territory_assignments").insert({
      doctor_id: doctorId,
      rep_id: profile.id,
      valid_from: new Date().toISOString().slice(0, 10),
      created_by: profile.id,
    });
  }

  revalidatePath("/hospitals");
  revalidatePath(`/doctors/${doctorId}`);
  revalidatePath("/doctors");
  return {};
}
