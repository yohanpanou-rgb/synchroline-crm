import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  /** 0-100 */
  value: number;
  /** 0-100, rendered as a dashed marker on top of the bar */
  targetValue?: number;
  colorClassName?: string;
  className?: string;
}

export function ProgressBar({
  value,
  targetValue,
  colorClassName = "bg-primary",
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const clampedTarget =
    targetValue !== undefined ? Math.min(100, Math.max(0, targetValue)) : undefined;

  return (
    <div
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-ink/10",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", colorClassName)}
        style={{ width: `${clampedValue}%` }}
      />
      {clampedTarget !== undefined && (
        <div
          className="absolute top-0 h-full w-0.5 border-l-2 border-dashed border-ink/50"
          style={{ left: `${clampedTarget}%` }}
          title={`Στόχος: ${clampedTarget.toFixed(0)}%`}
        />
      )}
    </div>
  );
}
