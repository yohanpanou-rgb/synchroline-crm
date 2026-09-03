import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { DoctorsSearchBar } from "@/components/doctors/DoctorsSearchBar";
import { Button } from "@/components/ui/Button";
import { RATING_CPO_OPTIONS } from "@/lib/constants/rating";
import { getAssignableReps } from "@/lib/queries/reps";
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
  rep: string | undefined,
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (rating) params.set("rating", rating);
  if (region) params.set("region", region);
  if (rep) params.set("rep", rep);
  const qs = params.toString();
  return qs ? `/doctors?${qs}` : "/doctors";
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rating?: string; region?: string; rep?: string }>;
}) {
  const profile = await requireProfile();
  const manager = isManagerOrAdmin(profile.role);
  const { q, rating, region, rep } = await searchParams;
  const supabase = await createClient();

  // Νοσοκομεία ανατεθειμένα στον επιλεγμένο rep (φίλτρου), ώστε το φίλτρο rep να
  // δείχνει και τους νοσοκομειακούς γιατρούς του, όχι μόνο τους ιδιώτες.
  let repHospitalNames: string[] = [];
  if (manager && rep) {
    const { data: repInstitutionRows } = await supabase
      .from("institution_reps")
      .select("institutions(name)")
      .eq("rep_id", rep);
    repHospitalNames = (repInstitutionRows ?? [])
      .map((r) => r.institutions?.name)
      .filter((n): n is string => !!n);
  }

  let query = supabase.from("doctors").select("*").order("last_name", { ascending: true });

  // Ίδια βάση φίλτρων (χωρίς rating), μόνο ιδιώτες — τα counts στα chips
  // παραμένουν βάση αξιολόγησης του ιδιωτικού πελατολογίου (KPI).
  let countQuery = supabase.from("doctors").select("rating_cpo").is("institution", null);

  if (q) {
    query = query.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`);
    countQuery = countQuery.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`);
  }
  if (rating) {
    query = query.eq("rating_cpo", rating as RatingCpo);
  }
  if (region) {
    query = query.eq("region", region);
    countQuery = countQuery.eq("region", region);
  }
  if (manager && rep) {
    query =
      repHospitalNames.length > 0
        ? query.or(`current_rep_id.eq.${rep},institution.in.(${repHospitalNames.map((n) => `"${n}"`).join(",")})`)
        : query.eq("current_rep_id", rep);
    countQuery = countQuery.eq("current_rep_id", rep);
  }

  const [{ data: doctors }, { data: ratingRows }, { data: regionRows }, reps] = await Promise.all([
    query,
    countQuery,
    supabase.from("doctors").select("region"),
    manager ? getAssignableReps(supabase) : Promise.resolve([]),
  ]);

  const ratingCounts = new Map<string, number>();
  for (const r of ratingRows ?? []) {
    ratingCounts.set(r.rating_cpo, (ratingCounts.get(r.rating_cpo) ?? 0) + 1);
  }
  const totalCount = ratingRows?.length ?? 0;

  const repsById = new Map(reps.map((r) => [r.id, r.full_name]));

  const regions = [
    ...new Set((regionRows ?? []).map((r) => r.region).filter((r): r is string => !!r)),
  ].sort((a, b) => a.localeCompare(b, "el"));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-primary-dark">
            Πελατολόγιο
          </h1>
          <p className="mt-0.5 text-xs text-ink/50">
            Οι νοσοκομειακοί γιατροί (🏥) φαίνονται εδώ για πλήρη εικόνα, αλλά δεν μετράνε στα
            KPI κάλυψης — διαχειρίσου τους από τα{" "}
            <Link href="/hospitals" className="text-primary hover:underline">
              Νοσοκομεία
            </Link>
            .
          </p>
        </div>
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

      <DoctorsSearchBar
        initialQuery={q ?? ""}
        regions={regions}
        initialRegion={region ?? ""}
        reps={manager ? reps : undefined}
        initialRep={rep ?? ""}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href={filterHref(q, undefined, region, rep)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            !rating ? "bg-primary-dark text-white" : "bg-ink/5 text-ink/60 hover:bg-ink/10",
          )}
        >
          Όλοι ({totalCount})
        </Link>
        {RATING_CPO_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={filterHref(q, opt.value, region, rep)}
            title={opt.description}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              rating === opt.value
                ? RATING_FILTER_TONE[opt.value]
                : "bg-ink/5 text-ink/60 hover:bg-ink/10",
            )}
          >
            {opt.label} ({ratingCounts.get(opt.value) ?? 0})
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
          <DoctorCard
            key={doctor.id}
            doctor={doctor}
            repName={manager ? repsById.get(doctor.current_rep_id ?? "") : undefined}
          />
        ))}
      </div>
    </div>
  );
}
