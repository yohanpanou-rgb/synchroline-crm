export type PacingStatus = "on_track" | "warning" | "danger";

export interface PacingInput {
  cycleStartDate: string; // ISO date
  cycleEndDate: string; // ISO date
  actualCoveragePct: number; // 0-100
  targetCoveragePct: number; // 0-100
  today?: Date;
}

export interface PacingResult {
  cycleProgressPct: number; // % of cycle days elapsed
  expectedCoveragePct: number; // where actual "should" be right now
  actualCoveragePct: number;
  targetCoveragePct: number;
  status: PacingStatus;
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

/**
 * Pacing indicator (PRD ενότητα 8.4): compares elapsed cycle time against
 * territory coverage achieved so far, scaled to the rep's target coverage.
 * Absence-day deduction (ενότητα 7.3) is a Phase 2 addition — not applied here.
 */
export function computePacing(input: PacingInput): PacingResult {
  const today = input.today ?? new Date();
  const start = new Date(input.cycleStartDate).getTime();
  const end = new Date(input.cycleEndDate).getTime();
  const now = today.getTime();

  const totalDays = Math.max(1, (end - start) / 86_400_000);
  const elapsedDays = clamp((now - start) / 86_400_000, 0, totalDays);
  const cycleProgressPct = clamp((elapsedDays / totalDays) * 100);

  const expectedCoveragePct = clamp(
    (cycleProgressPct / 100) * input.targetCoveragePct,
  );

  let status: PacingStatus = "on_track";
  if (expectedCoveragePct > 0) {
    const ratio = input.actualCoveragePct / expectedCoveragePct;
    if (ratio < 0.8) status = "danger";
    else if (ratio < 0.95) status = "warning";
  }

  return {
    cycleProgressPct,
    expectedCoveragePct,
    actualCoveragePct: clamp(input.actualCoveragePct),
    targetCoveragePct: clamp(input.targetCoveragePct),
    status,
  };
}

export const pacingStatusColor: Record<PacingStatus, string> = {
  on_track: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export const pacingStatusLabel: Record<PacingStatus, string> = {
  on_track: "Εντός στόχου",
  warning: "Κοντά στο όριο",
  danger: "Υστέρηση",
};
