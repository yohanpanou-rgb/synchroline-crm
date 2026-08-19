"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { formatDoctorName } from "@/lib/utils/name-normalization";

export interface DoctorSearchResult {
  id: string;
  name: string;
  region: string | null;
}

export async function createInstitution(name: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!isManagerOrAdmin(profile.role)) return { error: "Μη επιτρεπτή ενέργεια." };
  if (!name.trim()) return { error: "Απαιτείται όνομα νοσοκομείου." };

  const supabase = await createClient();
  const { error } = await supabase.from("institutions").insert({ name: name.trim() });
  if (error) return { error: error.message };

  revalidatePath("/hospitals");
  return {};
}

/** Γιατροί που δεν ανήκουν ήδη σε κάποιο νοσοκομείο — υποψήφιοι για ανάθεση. */
export async function searchAssignableDoctors(query: string): Promise<DoctorSearchResult[]> {
  const profile = await requireProfile();
  if (!isManagerOrAdmin(profile.role)) return [];
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

export async function assignDoctorToInstitution(
  doctorId: string,
  institution: string,
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!isManagerOrAdmin(profile.role)) return { error: "Μη επιτρεπτή ενέργεια." };

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
  return {};
}
