"use client";

import { useState } from "react";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import type { InstitutionGroup } from "@/lib/queries/institutions";
import { cn } from "@/lib/utils/cn";

export function HospitalAccordion({ groups }: { groups: InstitutionGroup[] }) {
  const [openName, setOpenName] = useState<string | null>(groups[0]?.name ?? null);

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
              <div className="space-y-2 border-t border-black/5 p-3">
                {group.doctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
