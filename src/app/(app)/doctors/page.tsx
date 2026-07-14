import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireProfile();
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("doctors")
    .select("*")
    .order("last_name", { ascending: true });

  if (q) {
    query = query.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`);
  }

  const { data: doctors } = await query;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-primary-dark">
          Πελατολόγιο
        </h1>
        <Link href="/doctors/new">
          <Button size="md">+ Νέος γιατρός</Button>
        </Link>
      </div>

      <form className="mb-5">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Αναζήτηση με επώνυμο ή όνομα…"
        />
      </form>

      <div className="space-y-2">
        {doctors?.length === 0 && (
          <p className="py-8 text-center text-sm text-ink/50">
            Δεν βρέθηκαν γιατροί.
          </p>
        )}
        {doctors?.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </div>
  );
}
