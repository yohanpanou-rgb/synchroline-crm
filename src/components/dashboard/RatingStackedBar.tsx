import type { RatingCpo } from "@/lib/types/database.types";
import { RATING_CPO_LABEL } from "@/lib/constants/rating";

const SEGMENT_ORDER: RatingCpo[] = ["1", "2", "3", "0", "ΥΔ"];

const SEGMENT_COLOR: Record<RatingCpo, string> = {
  "1": "bg-success",
  "2": "bg-primary",
  "3": "bg-warning",
  "0": "bg-ink/20",
  ΥΔ: "bg-danger",
};

export function RatingStackedBar({
  counts,
  total,
}: {
  counts: Record<RatingCpo, number>;
  total: number;
}) {
  if (total === 0) {
    return <div className="h-3 w-full rounded-full bg-ink/10" />;
  }

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full">
      {SEGMENT_ORDER.map((key) => {
        const count = counts[key];
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={key}
            className={SEGMENT_COLOR[key]}
            style={{ width: `${pct}%` }}
            title={`${RATING_CPO_LABEL[key]}: ${count} (${pct.toFixed(0)}%)`}
          />
        );
      })}
    </div>
  );
}
