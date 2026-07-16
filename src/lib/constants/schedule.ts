export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 21;
export const SLOT_MINUTES = 30;

/** "09:00", "09:30", … "20:30" — bookable slot start times. */
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  const totalMinutes = (WORK_END_HOUR - WORK_START_HOUR) * 60;
  for (let m = 0; m < totalMinutes; m += SLOT_MINUTES) {
    const hour = WORK_START_HOUR + Math.floor(m / 60);
    const minute = m % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return slots;
})();

export const WEEKDAY_LABELS = [
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
] as const;

export const WEEKDAY_LABELS_SHORT = ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"] as const;

export const MONTH_LABELS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
] as const;

/** Monday (local, midnight) of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-07-16" -> "16/07/2026". Accepts a Date or an ISO date string. */
export function formatDateGR(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Local midnight of the 1st of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local midnight of the last day of the month containing `date`. */
export function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Weeks (Mon-Sun) covering the full month containing `date`, including
 * leading/trailing days from adjacent months so every row has 7 days. */
export function getMonthGrid(date: Date): Date[][] {
  const gridStart = startOfWeek(startOfMonth(date));
  const gridEnd = addDays(startOfWeek(endOfMonth(date)), 6);
  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    weeks.push([0, 1, 2, 3, 4, 5, 6].map((i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

/** The nearest Mon-Fri date to `date`, moving forward for Sat and back for Sun. */
export function nearestWorkday(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return addDays(date, 2);
  if (day === 0) return addDays(date, 1);
  return date;
}

export const DAILY_VISIT_TARGET = 5;

/** Number of Mon-Fri days between two ISO dates, inclusive on both ends. */
export function countWorkdays(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
