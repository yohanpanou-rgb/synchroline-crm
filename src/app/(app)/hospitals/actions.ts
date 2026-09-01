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
 * Ανάθεση γιατρού σε νοσοκομείο. Ο γιατρός αφαιρείται πάντα από το προσωπικό
 * πελατολόγιο/KPI (current_rep_id = null) — η ορατότητά του πλέον καθορίζεται
 * αποκλειστικά από την ανάθεση του ΝΟΣΟΚΟΜΕΙΟΥ σε reps (institution_reps),
 * όχι από προσωπική ιδιοκτησία γιατρού. Ισχύει για όλα τα νοσοκομεία, κοινόχρηστα ή μη.
 */
export async function assignDoctorToInstitution(
  doctorId: string,
  institution: string,
): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("doctors")
    .update({ institution, current_rep_id: null })
    .eq("id", doctorId);
  if (error) return { error: error.message };

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

  revalidatePath("/hospitals");
  revalidatePath(`/doctors/${doctorId}`);
  revalidatePath("/doctors");
  return {};
}

/** Αναθέτει ένα νοσοκομείο σε ένα ή περισσότερους reps (πολλαπλή ανάθεση). Μόνο manager/admin. */
export async function setInstitutionReps(
  institutionId: string,
  repIds: string[],
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("institution_reps")
    .delete()
    .eq("institution_id", institutionId);
  if (deleteError) return { error: deleteError.message };

  if (repIds.length > 0) {
    const { error: insertError } = await supabase
      .from("institution_reps")
      .insert(repIds.map((repId) => ({ institution_id: institutionId, rep_id: repId })));
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/hospitals");
  return {};
}

/**
 * Αφαιρεί γιατρό από νοσοκομείο — ξαναγίνεται προσωπικό πελατολόγιο,
 * ανατιθέμενος σε όποιον rep έκανε την αφαίρεση.
 */
export async function removeDoctorFromInstitution(doctorId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("doctors")
    .update({ institution: null, current_rep_id: profile.id })
    .eq("id", doctorId);
  if (error) return { error: error.message };

  await supabase.from("territory_assignments").insert({
    doctor_id: doctorId,
    rep_id: profile.id,
    valid_from: new Date().toISOString().slice(0, 10),
    created_by: profile.id,
  });

  revalidatePath("/hospitals");
  revalidatePath(`/doctors/${doctorId}`);
  revalidatePath("/doctors");
  return {};
}
