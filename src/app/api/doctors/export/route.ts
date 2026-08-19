import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { RATING_CPO_LABEL } from "@/lib/constants/rating";
import type { RatingCpo } from "@/lib/types/database.types";

const STATUS_LABEL: Record<string, string> = {
  active: "Ενεργός",
  pending_approval: "Εκκρεμεί έγκριση",
  archived: "Αρχειοθετημένος",
};

/** Χρησιμοποιεί το per-request client, όχι service role — η εξαγωγή
 * σέβεται αυτόματα το ίδιο RLS scope που βλέπει ο χρήστης στο /doctors
 * (rep: μόνο δικοί του γιατροί, manager/admin: όλοι). */
export async function GET() {
  await requireProfile();
  const supabase = await createClient();

  const { data: doctors } = await supabase
    .from("doctors")
    .select("*")
    .order("last_name", { ascending: true });

  const rows = (doctors ?? []).map((d) => ({
    Επώνυμο: d.last_name,
    Όνομα: d.first_name,
    Περιοχή: d.region ?? "",
    "Νομός / Πόλη": d.county ?? "",
    Ειδικότητα: d.specialty ?? "",
    "Έδρα/Επαρχία": d.hq_type ?? "",
    "Τηλέφωνο 1": d.phone_1 ?? "",
    "Τηλέφωνο 2": d.phone_2 ?? "",
    Διεύθυνση: d.address ?? "",
    "Δυναμική κατηγορία": d.dynamic_category ?? "",
    "Αξιολόγηση (CPO)": RATING_CPO_LABEL[d.rating_cpo as RatingCpo] ?? d.rating_cpo,
    Κατάσταση: STATUS_LABEL[d.status] ?? d.status,
    "Φαρμακείο 1": d.pharmacy_1 ?? "",
    "Φαρμακείο 2": d.pharmacy_2 ?? "",
    Σημειώσεις: d.notes ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Πελατολόγιο");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pelatologio.xlsx"`,
    },
  });
}
