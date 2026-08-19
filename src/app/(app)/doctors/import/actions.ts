"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { normalizeDoctorName } from "@/lib/utils/name-normalization";
import type { Database } from "@/lib/types/database.types";

type DoctorUpdate = Database["public"]["Tables"]["doctors"]["Update"];
type DoctorInsert = Database["public"]["Tables"]["doctors"]["Insert"];

export interface DoctorImportRow {
  fullName: string;
  fields: Record<string, string>;
}

function nameKey(lastName: string, firstName: string): string {
  return `${lastName.trim().toUpperCase()}|${firstName.trim().toUpperCase()}`;
}

async function fetchAllDoctors(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ id: string; last_name: string; first_name: string }[]> {
  const all: { id: string; last_name: string; first_name: string }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("doctors")
      .select("id, last_name, first_name")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}

/**
 * Κάθε chunk ξαναδιαβάζει τους υπάρχοντες γιατρούς — φτηνό (λίγες χιλιάδες
 * γραμμές, id+last_name+first_name μόνο) και εξασφαλίζει ότι διπλότυπα
 * ΜΕΣΑ στο ίδιο import (σε διαφορετικό chunk) πιάνονται σωστά, αφού κάθε
 * νέος γιατρός γίνεται ορατός στο επόμενο chunk's fetch.
 */
export async function importDoctorsChunk(
  rows: DoctorImportRow[],
): Promise<{ error?: string; updated?: number; created?: number; createdNames?: string[] }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Μόνο ο admin μπορεί να κάνει εισαγωγή γιατρών." };
  }
  const supabase = await createClient();

  const existing = await fetchAllDoctors(supabase);
  const existingByKey = new Map(existing.map((d) => [nameKey(d.last_name, d.first_name), d]));

  let updated = 0;
  let created = 0;
  const createdNames: string[] = [];

  for (const row of rows) {
    const { lastName, firstName } = normalizeDoctorName(row.fullName);
    const key = nameKey(lastName, firstName);
    const match = existingByKey.get(key);

    if (match) {
      if (Object.keys(row.fields).length === 0) continue;
      const { error } = await supabase
        .from("doctors")
        .update(row.fields as DoctorUpdate)
        .eq("id", match.id);
      if (error) return { error: `Ενημέρωση ${row.fullName}: ${error.message}` };
      updated++;
    } else {
      const { data: insertedDoctor, error } = await supabase
        .from("doctors")
        .insert({
          full_name_raw: row.fullName,
          last_name: lastName,
          first_name: firstName,
          status: "active",
          ...row.fields,
        } as DoctorInsert)
        .select("id")
        .single();
      if (error) return { error: `Δημιουργία ${row.fullName}: ${error.message}` };
      created++;
      createdNames.push(row.fullName);

      if (insertedDoctor && row.fields.current_rep_id) {
        await supabase.from("territory_assignments").insert({
          doctor_id: insertedDoctor.id,
          rep_id: row.fields.current_rep_id,
          created_by: profile.id,
        });
      }
      existingByKey.set(key, { id: insertedDoctor!.id, last_name: lastName, first_name: firstName });
    }
  }

  return { updated, created, createdNames };
}
