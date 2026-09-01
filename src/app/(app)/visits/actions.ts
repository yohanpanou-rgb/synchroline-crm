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

/** Ανταγωνισμός ανά κατηγορία πάθησης (#38) — αντικαθιστά πλήρως τις προηγούμενες καταχωρήσεις της επίσκεψης. */
async function upsertCompetitorMentions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  formData: FormData,
) {
  await supabase.from("visit_competitor_mentions").delete().eq("visit_id", visitId);

  const category = str(formData, "competitor_category");
  if (!category) return;

  const brands = (str(formData, "competitor_brands") ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  const other = str(formData, "competitor_other");
  if (other) brands.push(other);
  if (brands.length === 0) return;

  await supabase.from("visit_competitor_mentions").insert(
    brands.map((competitor_name) => ({
      visit_id: visitId,
      category,
      competitor_name,
    })),
  );
}

async function upsertHospitalDoctors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  formData: FormData,
) {
  const doctorIds = formData.getAll("hospital_doctor_ids").filter(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  await supabase.from("visit_hospital_doctors").delete().eq("visit_id", visitId);
  if (doctorIds.length > 0) {
    await supabase
      .from("visit_hospital_doctors")
      .insert(doctorIds.map((doctor_id) => ({ visit_id: visitId, doctor_id })));
  }
}

/** Ειδοποιεί όλους τους managers/admin (#13) όταν το κουτάκι "Ειδοποίηση manager" είναι τσεκαρισμένο. */
async function notifyManagersIfFlagged(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  formData: FormData,
  actorId: string,
) {
  if (formData.get("notify_manager") !== "on") return;

  const { data: managers } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["manager", "admin"])
    .neq("id", actorId);

  if (!managers || managers.length === 0) return;

  const { data: actor } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", actorId)
    .maybeSingle();

  await supabase.from("notifications").insert(
    managers.map((m) => ({
      user_id: m.id,
      message: `${actor?.full_name ?? "Ένας rep"} σε επισήμανε σε επίσκεψη: ${str(formData, "notes") ?? ""}`.slice(0, 300),
      link: `/visits/${visitId}/edit`,
      created_by: actorId,
    })),
  );
}

export async function createVisit(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const manager = isManagerOrAdmin(profile.role);

  const doctorId = str(formData, "doctor_id");
  const hospitalId = str(formData, "hospital_id");
  const cycleId = str(formData, "cycle_id");
  const repId = (manager && str(formData, "rep_id")) || profile.id;

  if ((!doctorId && !hospitalId) || !cycleId) {
    redirect(`/visits/new?error=${encodeURIComponent("Επίλεξε γιατρό ή νοσοκομείο, και κύκλο.")}`);
  }

  const status = (str(formData, "status") as VisitStatus) ?? "planned";

  const { data: visit, error } = await supabase
    .from("visits")
    .insert({
      doctor_id: doctorId,
      hospital_id: hospitalId,
      rep_id: repId,
      cycle_id: cycleId!,
      visit_type: (str(formData, "visit_type") as VisitType) ?? "normal",
      status,
      scheduled_date: str(formData, "scheduled_date"),
      scheduled_time: status !== "cancelled" ? str(formData, "scheduled_time") : null,
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
  await upsertCompetitorMentions(supabase, visit.id, formData);
  if (hospitalId) await upsertHospitalDoctors(supabase, visit.id, formData);
  await notifyManagersIfFlagged(supabase, visit.id, formData, profile.id);

  revalidatePath("/visits");
  revalidatePath("/visits/calendar");
  if (doctorId) revalidatePath(`/doctors/${doctorId}`);
  if (hospitalId) revalidatePath("/hospitals");
  redirect("/visits");
}

export async function updateVisit(visitId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const manager = isManagerOrAdmin(profile.role);

  const doctorId = str(formData, "doctor_id");
  const hospitalId = str(formData, "hospital_id");
  const repId = (manager && str(formData, "rep_id")) || profile.id;
  const status = (str(formData, "status") as VisitStatus) ?? "planned";

  const { error } = await supabase
    .from("visits")
    .update({
      rep_id: repId,
      visit_type: (str(formData, "visit_type") as VisitType) ?? "normal",
      status,
      scheduled_date: str(formData, "scheduled_date"),
      scheduled_time: status !== "cancelled" ? str(formData, "scheduled_time") : null,
      completed_date: status === "completed" ? str(formData, "completed_date") : null,
      notes: str(formData, "notes"),
      location_context: str(formData, "location_context"),
    })
    .eq("id", visitId);

  if (error) {
    redirect(`/visits/${visitId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  await upsertProducts(supabase, visitId, formData);
  await upsertCompetitorMentions(supabase, visitId, formData);
  if (hospitalId) await upsertHospitalDoctors(supabase, visitId, formData);
  await notifyManagersIfFlagged(supabase, visitId, formData, profile.id);

  revalidatePath("/visits");
  revalidatePath("/visits/calendar");
  if (doctorId) revalidatePath(`/doctors/${doctorId}`);
  if (hospitalId) revalidatePath("/hospitals");
  redirect("/visits");
}

/**
 * Καλείται από drag-and-drop στο ημερολόγιο. Επιστρέφει { error } αντί για
 * redirect (client component, όχι <form>). Η πρόσβαση (rep μόνο στις δικές
 * του επισκέψεις, manager/admin παντού) καλύπτεται ήδη από την υπάρχουσα
 * "visits_write_own_or_manager" RLS policy — δεν αλλάζει το rep_id εδώ.
 */
export async function rescheduleVisit(
  visitId: string,
  date: string,
  time: string | null,
): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const update: { scheduled_date: string; scheduled_time?: string | null } = {
    scheduled_date: date,
  };
  if (time) update.scheduled_time = time;

  const { error } = await supabase.from("visits").update(update).eq("id", visitId);
  if (error) return { error: error.message };

  revalidatePath("/visits");
  revalidatePath("/visits/calendar");
  return {};
}

export async function cancelVisit(visitId: string) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("visits")
    .update({ status: "cancelled", scheduled_time: null })
    .eq("id", visitId)
    .eq("status", "planned");

  if (error) {
    redirect(`/visits?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/visits");
  revalidatePath("/visits/calendar");
}
