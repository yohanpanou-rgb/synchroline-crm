"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import type { HospitalCoverageEntry } from "@/lib/queries/reports";

export function HospitalCoverageAccordion({ entries }: { entries: HospitalCoverageEntry[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (entries.length === 0) {
    return <p className="py-4 text-center text-sm text-ink/50">Δεν υπάρχουν νοσοκομεία.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isOpen = openId === entry.id;
        const coveredPct =
          entry.doctorCount > 0 ? Math.round((entry.coveredDoctors.length / entry.doctorCount) * 100) : 0;

        return (
          <div key={entry.id} className="overflow-hidden rounded-xl border border-black/5">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : entry.id)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{entry.name}</p>
                <p className="text-xs text-ink/50">
                  {entry.visitsThisCycle} επισκέψεις στον κύκλο
                  {entry.byRep.length > 0 &&
                    ` · ${entry.byRep.map((r) => `${r.repName} (${r.count})`).join(", ")}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={coveredPct === 100 ? "success" : coveredPct === 0 ? "danger" : "neutral"}>
                  {entry.coveredDoctors.length}/{entry.doctorCount} καλύφθηκαν
                </Badge>
                <svg
                  viewBox="0 0 24 24"
                  className={cn("h-4 w-4 shrink-0 text-ink/40 transition-transform", isOpen && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </button>
            {isOpen && (
              <div className="grid gap-3 border-t border-black/5 p-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-success">
                    Καλύφθηκαν ({entry.coveredDoctors.length})
                  </p>
                  {entry.coveredDoctors.length === 0 ? (
                    <p className="text-xs text-ink/40">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {entry.coveredDoctors.map((d) => (
                        <li key={d.id} className="text-xs text-ink">{d.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-danger">
                    Δεν καλύφθηκαν ({entry.uncoveredDoctors.length})
                  </p>
                  {entry.uncoveredDoctors.length === 0 ? (
                    <p className="text-xs text-ink/40">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {entry.uncoveredDoctors.map((d) => (
                        <li key={d.id} className="text-xs text-ink">{d.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
