import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import { getWeekVisits, type CalendarVisit } from "@/lib/queries/calendar";
import { getAssignableReps } from "@/lib/queries/reps";
import {
  TIME_SLOTS,
  WEEKDAY_LABELS,
  startOfWeek,
  addDays,
  toISODate,
} from "@/lib/constants/schedule";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; rep?: string }>;
}) {
  const profile = await requireProfile();
  const manager = isManagerOrAdmin(profile.role);
  const { week, rep } = await searchParams;
  const supabase = await createClient();

  const anchor = week ? new Date(week) : new Date();
  const weekStart = startOfWeek(anchor);
  const weekDays = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const weekEnd = weekDays[4]!;

  const repId = manager ? rep : profile.id;

  const visits = await getWeekVisits(supabase, {
    weekStartISO: toISODate(weekStart),
    weekEndISO: toISODate(weekEnd),
    repId,
  });

  const bySlot = new Map<string, CalendarVisit[]>();
  for (const v of visits) {
    const key = `${v.scheduled_date}_${v.scheduled_time?.slice(0, 5)}`;
    const arr = bySlot.get(key) ?? [];
    arr.push(v);
    bySlot.set(key, arr);
  }

  const reps = manager ? await getAssignableReps(supabase) : [];

  const prevWeek = toISODate(addDays(weekStart, -7));
  const nextWeek = toISODate(addDays(weekStart, 7));
  const repParam = rep ? `&rep=${rep}` : "";

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

      {manager && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href={`/visits/calendar?week=${toISODate(weekStart)}`}
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
              href={`/visits/calendar?week=${toISODate(weekStart)}&rep=${r.id}`}
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

      <div className="mb-4 flex items-center justify-between">
        <Link href={`/visits/calendar?week=${prevWeek}${repParam}`}>
          <Button variant="secondary" size="md">
            ← Προηγούμενη
          </Button>
        </Link>
        <p className="text-sm font-medium text-ink">
          {toISODate(weekStart)} — {toISODate(weekEnd)}
        </p>
        <Link href={`/visits/calendar?week=${nextWeek}${repParam}`}>
          <Button variant="secondary" size="md">
            Επόμενη →
          </Button>
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
                  <span className="tabular-nums text-ink/40">{toISODate(d)}</span>
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
                  const key = `${toISODate(d)}_${time}`;
                  const cellVisits = bySlot.get(key) ?? [];
                  return (
                    <td
                      key={i}
                      className="border-b border-l border-black/5 p-0 align-top"
                    >
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
                            <Link
                              key={v.id}
                              href={`/doctors/${v.doctor_id}`}
                              className="block rounded-lg bg-primary/10 px-2 py-1 text-xs leading-tight text-primary-dark hover:bg-primary/20"
                            >
                              <p className="font-medium">
                                {v.doctor
                                  ? formatDoctorName(v.doctor.last_name, v.doctor.first_name)
                                  : "—"}
                              </p>
                              <p className="text-ink/50">
                                {[v.doctor?.region, v.doctor?.county]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                                {manager && v.rep ? ` · ${v.rep.full_name}` : ""}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
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
