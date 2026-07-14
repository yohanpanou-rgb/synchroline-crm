import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import {
  computePacing,
  pacingStatusColor,
  pacingStatusLabel,
} from "@/lib/utils/pacing";

interface PacingBarProps {
  label: string;
  cycleStartDate: string;
  cycleEndDate: string;
  actualCoveragePct: number;
  targetCoveragePct: number;
  subtitle?: string;
}

const toneForStatus = {
  on_track: "success",
  warning: "warning",
  danger: "danger",
} as const;

export function PacingBar({
  label,
  cycleStartDate,
  cycleEndDate,
  actualCoveragePct,
  targetCoveragePct,
  subtitle,
}: PacingBarProps) {
  const pacing = computePacing({
    cycleStartDate,
    cycleEndDate,
    actualCoveragePct,
    targetCoveragePct,
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          {subtitle && <p className="text-xs text-ink/50">{subtitle}</p>}
        </div>
        <Badge tone={toneForStatus[pacing.status]}>
          {pacingStatusLabel[pacing.status]}
        </Badge>
      </div>

      <ProgressBar
        value={pacing.actualCoveragePct}
        targetValue={pacing.targetCoveragePct}
        colorClassName={pacingStatusColor[pacing.status]}
      />

      <div className="mt-1.5 flex justify-between text-xs tabular-nums text-ink/50">
        <span>Κάλυψη {pacing.actualCoveragePct.toFixed(0)}%</span>
        <span>Χρόνος κύκλου {pacing.cycleProgressPct.toFixed(0)}%</span>
        <span>Στόχος {pacing.targetCoveragePct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
