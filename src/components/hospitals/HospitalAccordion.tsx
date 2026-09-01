"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { AssignDoctorWidget } from "@/components/hospitals/AssignDoctorWidget";
import { removeDoctorFromInstitution, setInstitutionReps } from "@/app/(app)/hospitals/actions";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import type { InstitutionGroup } from "@/lib/queries/institutions";
import { cn } from "@/lib/utils/cn";

interface RepOption {
  id: string;
  full_name: string;
}

export function HospitalAccordion({
  groups,
  manager,
  reps,
}: {
  groups: InstitutionGroup[];
  manager: boolean;
  reps: RepOption[];
}) {
  const [openName, setOpenName] = useState<string | null>(groups[0]?.name ?? null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const repsById = new Map(reps.map((r) => [r.id, r.full_name]));

  function handleRemove(doctorId: string, doctorName: string) {
    if (!window.confirm(`Αφαίρεση του "${doctorName}" από το νοσοκομείο;`)) return;
    startTransition(async () => {
      await removeDoctorFromInstitution(doctorId);
      router.refresh();
    });
  }

  function toggleRep(institutionId: string, currentRepIds: string[], repId: string) {
    const next = currentRepIds.includes(repId)
      ? currentRepIds.filter((id) => id !== repId)
      : [...currentRepIds, repId];
    startTransition(async () => {
      await setInstitutionReps(institutionId, next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = openName === group.name;
        return (
          <div
            key={group.name}
            className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenName(isOpen ? null : group.name)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-primary-dark">{group.name}</span>
              <span className="flex items-center gap-2 text-xs text-ink/50">
                {group.doctors.length} γιατροί
                <svg
                  viewBox="0 0 24 24"
                  className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-black/5 p-3">
                <div className="rounded-xl bg-ink/5 p-2">
                  <p className="mb-1.5 text-xs font-medium text-ink/60">
                    Ανατεθειμένο σε:
                  </p>
                  {manager ? (
                    <div className="flex flex-wrap gap-1.5">
                      {reps.map((rep) => {
                        const active = group.repIds.includes(rep.id);
                        return (
                          <button
                            key={rep.id}
                            type="button"
                            disabled={isPending}
                            onClick={() => toggleRep(group.id, group.repIds, rep.id)}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50",
                              active
                                ? "bg-primary text-white"
                                : "bg-white text-ink/60 hover:bg-ink/10",
                            )}
                          >
                            {rep.full_name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-ink">
                      {group.repIds.length > 0
                        ? group.repIds.map((id) => repsById.get(id) ?? "—").join(", ")
                        : group.isShared
                          ? "Κοινόχρηστο — ορατό σε όλους"
                          : "Δεν έχει ανατεθεί ακόμα σε συγκεκριμένο rep"}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-ink/5 p-2">
                  <div className="min-w-[220px] flex-1">
                    <AssignDoctorWidget institution={group.name} />
                  </div>
                  <Link
                    href={`/doctors/new?institution=${encodeURIComponent(group.name)}`}
                    className="whitespace-nowrap text-xs font-medium text-primary hover:underline"
                  >
                    + Νέος γιατρός εδώ
                  </Link>
                </div>
                {group.doctors.length === 0 ? (
                  <p className="py-2 text-center text-sm text-ink/50">
                    Δεν έχει ανατεθεί ακόμα κανένας γιατρός.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.doctors.map((doctor) => (
                      <div key={doctor.id} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <DoctorCard doctor={doctor} />
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleRemove(
                              doctor.id,
                              formatDoctorName(doctor.last_name, doctor.first_name),
                            )
                          }
                          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                        >
                          Αφαίρεση
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
