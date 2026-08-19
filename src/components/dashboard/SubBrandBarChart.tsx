import type { SubBrandStats } from "@/lib/queries/prescriptions";

export function SubBrandBarChart({ stats }: { stats: SubBrandStats[] }) {
  const max = Math.max(1, ...stats.map((s) => s.average ?? 0));

  return (
    <div className="space-y-2.5">
      {stats.map((s) => (
        <div key={s.brand}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-ink">{s.label}</span>
            <span className="tabular-nums text-ink/50">
              {s.average !== null ? s.average.toFixed(1) : "—"} / εβδ. ({s.count} γιατροί)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${((s.average ?? 0) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
