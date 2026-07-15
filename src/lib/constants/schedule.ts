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

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
