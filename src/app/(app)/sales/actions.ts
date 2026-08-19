"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";

export interface SalesImportRow {
  sale_date: string;
  sub_brand: string;
  nomos: string;
  delivery_nomos: string | null;
  product_code: string;
  product_description: string | null;
  customer_code: string | null;
  customer_name: string | null;
  quantity: number;
  net_value: number;
  is_sample: boolean;
}

/**
 * Called once per chunk from the client wizard (the full file can be tens
 * of thousands of rows — too large for one request). The first chunk wipes
 * the table (full-replace import), later chunks just append.
 */
export async function importSalesChunk(
  rows: SalesImportRow[],
  isFirstChunk: boolean,
): Promise<{ error?: string; inserted?: number }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Μόνο ο admin μπορεί να κάνει εισαγωγή πωλήσεων." };
  }

  const supabase = await createClient();

  if (isFirstChunk) {
    const { error: deleteError } = await supabase
      .from("sales_records")
      .delete()
      .not("id", "is", null);
    if (deleteError) return { error: deleteError.message };
  }

  if (rows.length === 0) return { inserted: 0 };

  const { error } = await supabase.from("sales_records").insert(rows);
  if (error) return { error: error.message };

  return { inserted: rows.length };
}

export async function finishSalesImport(): Promise<void> {
  revalidatePath("/sales");
  revalidatePath("/sales/import");
}

export async function setNomosReps(nomos: string, formData: FormData): Promise<void> {
  const profile = await requireProfile();
  if (!isManagerOrAdmin(profile.role)) return;

  const repIds = formData.getAll("repIds").map(String);
  const supabase = await createClient();

  await supabase.from("sales_territory_reps").delete().eq("nomos", nomos);
  if (repIds.length > 0) {
    await supabase
      .from("sales_territory_reps")
      .insert(repIds.map((repId) => ({ nomos, rep_id: repId })));
  }

  revalidatePath("/sales/territories");
  revalidatePath("/sales");
}
