import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: doctor, error } = await supabase
    .from("doctors")
    .select(
      "last_name, first_name, region, county, specialty, phone_1, dynamic_category, priority_color, weekly_rx_aknicare, weekly_rx_closebax, weekly_rx_terproline, weekly_rx_rosacure",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !doctor) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: lastVisit } = await supabase
    .from("visits")
    .select("status, scheduled_date, completed_date")
    .eq("doctor_id", id)
    .eq("status", "completed")
    .order("completed_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ doctor, lastVisit: lastVisit ?? null });
}
