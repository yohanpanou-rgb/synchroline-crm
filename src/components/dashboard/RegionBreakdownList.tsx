import type { RegionBreakdown } from "@/lib/queries/trends";

export function RegionBreakdownList({ regions }: { regions: RegionBreakdown[] }) {
  if (regions.length === 0) {
    return <p className="py-4 text-sm text-ink/50">Δεν υπάρχουν δεδομένα.</p>;
  }

  const max = Math.max(1, ...regions.map((r) => r.doctorCount));

  return (
    <div className="space-y-2.5">
      {regions.slice(0, 10).map((r) => (
        <div key={r.region}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-ink">{r.region}</span>
            <span className="tabular-nums text-ink/50">
              {r.doctorCount} γιατροί · {r.visitsThisCycle} επισκέψεις
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(r.doctorCount / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
