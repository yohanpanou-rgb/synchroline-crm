import type { WeekBucket } from "@/lib/queries/trends";

export function TrendChart({ buckets }: { buckets: WeekBucket[] }) {
  if (buckets.length === 0) {
    return <p className="py-4 text-sm text-ink/50">Δεν υπάρχουν δεδομένα.</p>;
  }

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const width = 320;
  const height = 100;
  const barGap = 6;
  const barWidth = (width - barGap * (buckets.length - 1)) / buckets.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 20}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Τάση επισκέψεων ανά εβδομάδα"
    >
      {buckets.map((b, i) => {
        const barHeight = (b.count / max) * height;
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        return (
          <g key={b.weekStart}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              className="fill-primary"
            >
              <title>{`${b.label}: ${b.count} επισκέψεις`}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={height + 14}
              textAnchor="middle"
              className="fill-current text-[8px] text-ink/50"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
