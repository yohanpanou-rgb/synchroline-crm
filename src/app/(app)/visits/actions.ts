"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import type {
  ProductName,
  VisitStatus,
  VisitType,
} from "@/lib/types/database.types";

const PRODUCTS: ProductName[] = [
  "aknicare",
  "closebax",
  "terproline",
  "rosacure",
];

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

async function upsertProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  formData: FormData,
) {
  const productRows = PRODUCTS.map((product) => ({
    visit_id: visitId,
    product_name: product,
    samples_given: Number(formData.get(`samples_${product}`) ?? 0) || 0,
    notes: str(formData, `notes_${product}`),
  }));

  await supabase
    .from("visit_products")
    .upsert(productRows, { onConflict: "visit_id,product_name" });
}

export async function createVisit(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const manager = isManagerOrAdmin(profile.role);

  const doctorId = str(formData, "doctor_id");
  const cycleId = str(formData, "cycle_id");
  const repId = (manager && str(formData, "rep_id")) || profile.id;

  if (!doctorId || !cycleId) {
    redirect(`/visits/new?error=${encodeURIComponent("Επίλεξε γιατρό και κύκλο.")}`);
  }

  const status = (str(formData, "status") as VisitStatus) ?? "planned";

  const { data: visit, error } = await supabase
    .from("visits")
    .insert({
      doctor_id: doctorId!,
      rep_id: repId,
      cycle_id: cycleId!,
      visit_type: (str(formData, "visit_type") as VisitType) ?? "normal",
      status,
      scheduled_date: str(formData, "scheduled_date"),
      scheduled_time: status === "planned" ? str(formData, "scheduled_time") : null,
      completed_date: status === "completed" ? str(formData, "completed_date") : null,
      notes: str(formData, "notes"),
      location_context: str(formData, "location_context"),
    })
    .select("id")
    .single();

  if (error || !visit) {
    redirect(
      `/visits/new?error=${encodeURIComponent(error?.message ?? "Αποτυχία καταχώρησης")}`,
    );
  }

  await upsertProducts(supabase, visit.id, formData);

  revalidatePath("/visits");
  revalidatePath("/visits/calendar");
  revalidatePath(`/doctors/${doctorId}`);
  redirect("/visits");
}

export async function updateVisit(visitId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const manager = isManagerOrAdmin(profile.role);

  const doctorId = str(formData, "doctor_id");
  const repId = (manager && str(formData, "rep_id")) || profile.id;
  const status = (str(formData, "status") as VisitStatus) ?? "planned";

  const { error } = await supabase
    .from("visits")
    .update({
      rep_id: repId,
      visit_type: (str(formData, "visit_type") as VisitType) ?? "normal",
      status,
      scheduled_date: str(formData, "scheduled_date"),
      scheduled_time: status === "planned" ? str(formData, "scheduled_time") : null,
      completed_date: status === "completed" ? str(formData, "completed_date") : null,
      notes: str(formData, "notes"),
      location_context: str(formData, "location_context"),
    })
    .eq("id", visitId);

  if (error) {
    redirect(`/visits/${visitId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  await upsertProducts(supabase, visitId, formData);

  revalidatePath("/visits");
  revalidatePath("/visits/calendar");
  revalidatePath(`/doctors/${doctorId}`);
  redirect("/visits");
}

export async function cancelVisit(visitId: string) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("visits")
    .update({ status: "cancelled" })
    .eq("id", visitId)
    .eq("status", "planned");

  if (error) {
    redirect(`/visits?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/visits");
  revalidatePath("/visits/calendar");
}
