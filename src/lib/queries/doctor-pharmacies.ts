import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export interface DoctorPharmacyLink {
  linkId: string;
  role: "primary" | "secondary";
  pharmacy: { id: string; name: string; city: string | null };
}

export async function getDoctorPharmacies(
  supabase: Client,
  doctorId: string,
): Promise<DoctorPharmacyLink[]> {
  const { data } = await supabase
    .from("doctor_pharmacies")
    .select("id, role, pharmacies(id, name, city)")
    .eq("doctor_id", doctorId);

  return (data ?? [])
    .filter((row) => row.pharmacies)
    .map((row) => ({
      linkId: row.id,
      role: row.role,
      pharmacy: row.pharmacies as unknown as { id: string; name: string; city: string | null },
    }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1));
}
