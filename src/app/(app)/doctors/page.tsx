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

function filterHref(
  q: string | undefined,
  rating: string | undefined,
  region: string | undefined,
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (rating) params.set("rating", rating);
  if (region) params.set("region", region);
  const qs = params.toString();
  return qs ? `/doctors?${qs}` : "/doctors";
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rating?: string; region?: string }>;
}) {
  const profile = await requireProfile();
  const { q, rating, region } = await searchParams;
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
  if (region) {
    query = query.eq("region", region);
  }

  const [{ data: doctors }, { data: regionRows }] = await Promise.all([
    query,
    supabase.from("doctors").select("region"),
  ]);

  const regions = [
    ...new Set((regionRows ?? []).map((r) => r.region).filter((r): r is string => !!r)),
  ].sort((a, b) => a.localeCompare(b, "el"));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-primary-dark">
          Πελατολόγιο
        </h1>
        <div className="flex flex-wrap justify-end gap-2">
          <a href="/api/doctors/export">
            <Button variant="secondary" size="md">Εξαγωγή Excel</Button>
          </a>
          {profile.role === "admin" && (
            <Link href="/doctors/import">
              <Button variant="secondary" size="md">Εισαγωγή αρχείου</Button>
            </Link>
          )}
          <Link href="/doctors/new">
            <Button size="md">+ Νέος γιατρός</Button>
          </Link>
        </div>
      </div>

      <form className="mb-3 flex gap-2">
        {rating && <input type="hidden" name="rating" value={rating} />}
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Αναζήτηση με επώνυμο ή όνομα…"
        />
        <select
          name="region"
          defaultValue={region ?? ""}
          className="h-11 shrink-0 rounded-xl border border-black/10 bg-white px-3 text-sm text-ink"
        >
          <option value="">Όλες οι περιοχές</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href={filterHref(q, undefined, region)}
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
            href={filterHref(q, opt.value, region)}
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
