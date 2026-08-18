import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/profile";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RATING_CPO_OPTIONS } from "@/lib/constants/rating";
import type { RatingCpo } from "@/lib/types/database.types";
import { cn } from "@/lib/utils/cn";

const RATING_FILTER_TONE: Record<RatingCpo, string> = {
  "1": "bg-success text-white",
  "2": "bg-primary text-white",
  "3": "bg-warning text-white",
  "0": "bg-ink/20 text-ink",
  ΥΔ: "bg-danger text-white",
};

function filterHref(q: string | undefined, rating: string | undefined) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (rating) params.set("rating", rating);
  const qs = params.toString();
  return qs ? `/doctors?${qs}` : "/doctors";
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rating?: string }>;
}) {
  await requireProfile();
  const { q, rating } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("doctors")
    .select("*")
    .order("last_name", { ascending: true });

  if (q) {
    query = query.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`);
  }
  if (rating) {
    query = query.eq("rating_cpo", rating as RatingCpo);
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

      <form className="mb-3">
        {rating && <input type="hidden" name="rating" value={rating} />}
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Αναζήτηση με επώνυμο ή όνομα…"
        />
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href={filterHref(q, undefined)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            !rating ? "bg-primary-dark text-white" : "bg-ink/5 text-ink/60 hover:bg-ink/10",
          )}
        >
          Όλοι
        </Link>
        {RATING_CPO_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={filterHref(q, opt.value)}
            title={opt.description}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              rating === opt.value
                ? RATING_FILTER_TONE[opt.value]
                : "bg-ink/5 text-ink/60 hover:bg-ink/10",
            )}
          >
            {opt.label}
          </Link>
        ))}
      </div>

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
