import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getVisitsInRange, type CalendarVisit } from "@/lib/queries/calendar";
import { getAssignableReps } from "@/lib/queries/reps";
import {
  TIME_SLOTS,
  WEEKDAY_LABELS,
  WEEKDAY_LABELS_SHORT,
  MONTH_LABELS,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  getMonthGrid,
  addDays,
  toISODate,
  formatDateGR,
} from "@/lib/constants/schedule";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { Button } from "@/components/ui/Button";
import { DoctorHoverCard } from "@/components/visits/DoctorHoverCard";
import { DraggableVisit, DroppableSlot } from "@/components/visits/CalendarDnD";
import { cn } from "@/lib/utils/cn";

type ViewMode = "day" | "week" | "month";

function groupBySlot(visits: CalendarVisit[]) {
  const map = new Map<string, CalendarVisit[]>();
  for (const v of visits) {
    const key = `${v.scheduled_date}_${v.scheduled_time?.slice(0, 5) ?? "none"}`;
    const arr = map.get(key) ?? [];
    arr.push(v);
    map.set(key, arr);
  }
  return map;
}

function VisitChip({ visit }: { visit: CalendarVisit }) {
  const completed = visit.status === "completed";
  return (
    <DoctorHoverCard
      doctorId={visit.doctor_id}
      href={`/visits/${visit.id}/edit`}
      className={cn(
        "block truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight hover:opacity-80",
        completed ? "bg-success/15 text-success" : "bg-primary/10 text-primary-dark",
      )}
    >
      <p className="truncate font-medium">
        {visit.doctor
          ? formatDoctorName(visit.doctor.last_name, visit.doctor.first_name)
          : "—"}
      </p>
    </DoctorHoverCard>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; rep?: string }>;
}) {
  const profile = await requireProfile();
  const manager = isManagerOrAdmin(profile.role);
  const { view: viewParam, date, rep } = await searchParams;
  const view: ViewMode =
    viewParam === "day" || viewParam === "month" ? viewParam : "week";

  const supabase = await createClient();
  const anchor = date ? new Date(date) : new Date();
  const repId = manager ? rep : profile.id;
  const reps = manager ? await getAssignableReps(supabase) : [];
  const repParam = rep ? `&rep=${rep}` : "";

  const viewLink = (v: ViewMode, d: Date) =>
    `/visits/calendar?view=${v}&date=${toISODate(d)}${repParam}`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-primary-dark">
          Ημερολόγιο επισκέψεων
        </h1>
        <Link href="/visits/new">
          <Button size="md">+ Νέα επίσκεψη</Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-black/5 p-1">
          {(["day", "week", "month"] as const).map((v) => (
            <Link
              key={v}
              href={viewLink(v, anchor)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                view === v ? "bg-white text-primary shadow-sm" : "text-ink/50",
              )}
            >
              {v === "day" ? "Ημέρα" : v === "week" ? "Εβδομάδα" : "Μήνας"}
            </Link>
          ))}
        </div>

        {manager && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/visits/calendar?view=${view}&date=${toISODate(anchor)}`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                !rep ? "bg-primary text-white" : "bg-black/5 text-ink/60",
              )}
            >
              Όλοι
            </Link>
            {reps.map((r) => (
              <Link
                key={r.id}
                href={`/visits/calendar?view=${view}&date=${toISODate(anchor)}&rep=${r.id}`}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  rep === r.id ? "bg-primary text-white" : "bg-black/5 text-ink/60",
                )}
              >
                {r.full_name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {view === "day" && (
        <DayView supabase={supabase} anchor={anchor} repId={repId} manager={manager} repParam={repParam} />
      )}
      {view === "week" && (
        <WeekView supabase={supabase} anchor={anchor} repId={repId} manager={manager} repParam={repParam} />
      )}
      {view === "month" && (
        <MonthView supabase={supabase} anchor={anchor} repId={repId} manager={manager} repParam={repParam} />
      )}
    </div>
  );
}

interface ViewProps {
  supabase: Awaited<ReturnType<typeof createClient>>;
  anchor: Date;
  repId?: string;
  manager: boolean;
  repParam: string;
}

async function WeekView({ supabase, anchor, repId, manager, repParam }: ViewProps) {
  const weekStart = startOfWeek(anchor);
  const weekDays = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const weekEnd = weekDays[4]!;

  const visits = await getVisitsInRange(supabase, {
    startISO: toISODate(weekStart),
    endISO: toISODate(weekEnd),
    repId,
  });
  const bySlot = groupBySlot(visits);

  const prevWeek = toISODate(addDays(weekStart, -7));
  const nextWeek = toISODate(addDays(weekStart, 7));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/visits/calendar?view=week&date=${prevWeek}${repParam}`}>
          <Button variant="secondary" size="md">← Προηγούμενη</Button>
        </Link>
        <p className="text-sm font-medium text-ink">
          {formatDateGR(weekStart)} — {formatDateGR(weekEnd)}
        </p>
        <Link href={`/visits/calendar?view=week&date=${nextWeek}${repParam}`}>
          <Button variant="secondary" size="md">Επόμενη →</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-16 border-b border-black/5 p-2 text-left text-xs font-medium text-ink/50">
                Ώρα
              </th>
              {weekDays.map((d, i) => (
                <th
                  key={i}
                  className="border-b border-l border-black/5 p-2 text-left text-xs font-medium text-ink/50"
                >
                  {WEEKDAY_LABELS[i]}
                  <br />
                  <span className="tabular-nums text-ink/40">{formatDateGR(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => (
              <tr key={time}>
                <td className="border-b border-black/5 p-2 align-top text-xs tabular-nums text-ink/50">
                  {time}
                </td>
                {weekDays.map((d, i) => {
                  const cellVisits = bySlot.get(`${toISODate(d)}_${time}`) ?? [];
                  return (
                    <td key={i} className="border-b border-l border-black/5 p-0 align-top">
                      <DroppableSlot date={toISODate(d)} time={time} className="min-h-11">
                        {cellVisits.length === 0 ? (
                          <Link
                            href={`/visits/new?date=${toISODate(d)}&time=${time}`}
                            title="Νέα επίσκεψη"
                            className="flex min-h-11 w-full items-center justify-center text-ink/20 transition-colors hover:bg-primary/5 hover:text-primary"
                          >
                            <span className="text-lg leading-none">+</span>
                          </Link>
                        ) : (
                          <div className="space-y-1 p-1">
                            {cellVisits.map((v) => (
                              <DraggableVisit key={v.id} visitId={v.id}>
                                <VisitChip visit={v} />
                              </DraggableVisit>
                            ))}
                          </div>
                        )}
                      </DroppableSlot>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function DayView({ supabase, anchor, repId, manager, repParam }: ViewProps) {
  const day = new Date(anchor);
  day.setHours(0, 0, 0, 0);
  const dayISO = toISODate(day);
  const weekdayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1; // 0=Mon..6=Sun

  const visits = await getVisitsInRange(supabase, {
    startISO: dayISO,
    endISO: dayISO,
    repId,
  });
  const bySlot = groupBySlot(visits);

  const prevDay = toISODate(addDays(day, -1));
  const nextDay = toISODate(addDays(day, 1));
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/visits/calendar?view=day&date=${prevDay}${repParam}`}>
          <Button variant="secondary" size="md">← Προηγούμενη</Button>
        </Link>
        <p className="text-sm font-medium text-ink">
          {weekdayIndex < 5 ? WEEKDAY_LABELS[weekdayIndex] : weekdayIndex === 5 ? "Σάββατο" : "Κυριακή"}
          {" · "}
          {formatDateGR(day)}
        </p>
        <Link href={`/visits/calendar?view=day&date=${nextDay}${repParam}`}>
          <Button variant="secondary" size="md">Επόμενη →</Button>
        </Link>
      </div>

      {isWeekend ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-ink/50 shadow-sm">
          Δεν υπάρχει προγραμματισμός Σαββατοκύριακου.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {TIME_SLOTS.map((time) => {
                const cellVisits = bySlot.get(`${dayISO}_${time}`) ?? [];
                return (
                  <tr key={time}>
                    <td className="w-16 border-b border-black/5 p-2 align-top text-xs tabular-nums text-ink/50">
                      {time}
                    </td>
                    <td className="border-b border-l border-black/5 p-0 align-top">
                      <DroppableSlot date={dayISO} time={time} className="min-h-11">
                        {cellVisits.length === 0 ? (
                          <Link
                            href={`/visits/new?date=${dayISO}&time=${time}`}
                            title="Νέα επίσκεψη"
                            className="flex min-h-11 w-full items-center px-3 text-ink/20 transition-colors hover:bg-primary/5 hover:text-primary"
                          >
                            <span className="text-lg leading-none">+</span>
                          </Link>
                        ) : (
                          <div className="space-y-1 p-1">
                            {cellVisits.map((v) => (
                              <DraggableVisit key={v.id} visitId={v.id}>
                                <VisitChip visit={v} />
                              </DraggableVisit>
                            ))}
                          </div>
                        )}
                      </DroppableSlot>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function MonthView({ supabase, anchor, repId, manager, repParam }: ViewProps) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const grid = getMonthGrid(anchor);

  const visits = await getVisitsInRange(supabase, {
    startISO: toISODate(grid[0]![0]!),
    endISO: toISODate(grid[grid.length - 1]![6]!),
    repId,
  });

  const byDate = new Map<string, CalendarVisit[]>();
  for (const v of visits) {
    const arr = byDate.get(v.scheduled_date) ?? [];
    arr.push(v);
    byDate.set(v.scheduled_date, arr);
  }

  const prevMonth = toISODate(addDays(monthStart, -1));
  const nextMonth = toISODate(addDays(monthEnd, 1));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/visits/calendar?view=month&date=${prevMonth}${repParam}`}>
          <Button variant="secondary" size="md">← Προηγούμενος</Button>
        </Link>
        <p className="text-sm font-medium text-ink">
          {MONTH_LABELS[monthStart.getMonth()]} {monthStart.getFullYear()}
        </p>
        <Link href={`/visits/calendar?view=month&date=${nextMonth}${repParam}`}>
          <Button variant="secondary" size="md">Επόμενος →</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              {WEEKDAY_LABELS_SHORT.map((label) => (
                <th
                  key={label}
                  className="border-b border-black/5 p-2 text-left text-xs font-medium text-ink/50"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={wi}>
                {week.map((d, di) => {
                  const inMonth = d.getMonth() === monthStart.getMonth();
                  const dayVisits = byDate.get(toISODate(d)) ?? [];
                  const isWeekend = di >= 5;
                  return (
                    <td
                      key={di}
                      className={cn(
                        "h-24 min-w-[90px] border-b border-l border-black/5 p-0 align-top",
                        !inMonth && "bg-black/[0.02]",
                      )}
                    >
                      <DroppableSlot
                        date={toISODate(d)}
                        className={cn("h-full p-1.5", isWeekend && "pointer-events-none")}
                      >
                        <Link
                          href={
                            isWeekend
                              ? "#"
                              : `/visits/calendar?view=day&date=${toISODate(d)}${repParam}`
                          }
                          className={cn(
                            "text-xs tabular-nums",
                            inMonth ? "text-ink/70" : "text-ink/30",
                            isWeekend && "pointer-events-none",
                          )}
                        >
                          {d.getDate()}
                        </Link>
                        {dayVisits.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {dayVisits.slice(0, 2).map((v) => (
                              <DraggableVisit key={v.id} visitId={v.id}>
                                <DoctorHoverCard
                                  doctorId={v.doctor_id}
                                  href={`/visits/${v.id}/edit`}
                                  className={cn(
                                    "block truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                                    v.status === "completed"
                                      ? "bg-success/15 text-success"
                                      : "bg-primary/10 text-primary-dark",
                                  )}
                                >
                                  {v.doctor
                                    ? formatDoctorName(v.doctor.last_name, v.doctor.first_name)
                                    : "—"}
                                </DoctorHoverCard>
                              </DraggableVisit>
                            ))}
                            {dayVisits.length > 2 && (
                              <p className="px-1 text-[10px] text-ink/40">
                                +{dayVisits.length - 2} ακόμα
                              </p>
                            )}
                          </div>
                        )}
                      </DroppableSlot>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
