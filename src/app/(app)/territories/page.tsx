import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getTerritoryMapData } from "@/lib/queries/territories";
import { getAssignableReps } from "@/lib/queries/reps";
import { buildRepColorMap } from "@/lib/constants/rep-colors";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TerritoryMapLoader } from "@/components/territories/TerritoryMapLoader";

export default async function TerritoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const profile = await requireProfile();
  const manager = isManagerOrAdmin(profile.role);
  const { all } = await searchParams;
  const showAll = manager && all === "1";

  const supabase = await createClient();
  const [areas, reps] = await Promise.all([
    getTerritoryMapData(supabase, { repId: showAll ? undefined : profile.id }),
    getAssignableReps(supabase),
  ]);
  const colorMap = buildRepColorMap(reps);

  const totalUniverse = areas.reduce((sum, a) => sum + a.universeCount, 0);
  const totalCpo = areas.reduce((sum, a) => sum + a.cpoCovered, 0);
  const mixedCount = areas.filter((a) => a.isMixed).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-primary-dark">
            Χάρτης Territories
          </h1>
          <p className="text-sm text-ink/50">
            Ομαδοποίηση ιδιωτών γιατρών ανά κανονική περιοχή. Νοσοκομειακοί
            γιατροί εξαιρούνται πάντα.
          </p>
        </div>
        {manager && (
          <Link
            href={showAll ? "/territories" : "/territories?all=1"}
            className="rounded-xl border border-black/10 px-3.5 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
          >
            {showAll ? "Δες μόνο τις δικές μου" : "Δες όλη τη χώρα"}
          </Link>
        )}
      </div>

      {areas.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink/50">
            Δεν υπάρχουν ακόμα γιατροί με συμπληρωμένη κανονική περιοχή
            (area_id). Ο χάρτης θα γεμίσει μετά το backfill του πεδίου
            «Περιοχή» -- ή καθώς προστίθενται/επεξεργάζονται γιατροί μέσω του
            νέου combobox περιοχής στην καρτέλα γιατρού.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Card>
              <p className="text-xs text-ink/50">Περιοχές στον χάρτη</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary-dark">
                {areas.length}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-ink/50">Universe / CPO</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary-dark">
                {totalUniverse} / {totalCpo}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-ink/50">Μικτές περιοχές</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary-dark">
                {mixedCount}
              </p>
            </Card>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-black/5 shadow-sm"
            style={{ height: "560px" }}
          >
            <TerritoryMapLoader areas={areas} colorMap={colorMap} />
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Υπόμνημα</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/70">
              {reps.map((rep) => (
                <span key={rep.id} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colorMap[rep.id] }}
                  />
                  {rep.full_name}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-ink/40" />
                Μικτή περιοχή (&gt;1 rep)
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
