"use client";

import { useState, useTransition } from "react";
import { RATING_CPO_OPTIONS } from "@/lib/constants/rating";
import type { RatingCpo } from "@/lib/types/database.types";
import { updateDoctorRating } from "@/app/(app)/doctors/actions";
import { cn } from "@/lib/utils/cn";

const TONE_CLASSES: Record<RatingCpo, string> = {
  "1": "bg-success text-white",
  "2": "bg-primary text-white",
  "3": "bg-warning text-white",
  "0": "bg-ink/20 text-ink",
  ΥΔ: "bg-danger text-white",
};

export function RatingCpoControl({
  doctorId,
  initialValue,
}: {
  doctorId: string;
  initialValue: RatingCpo;
}) {
  const [value, setValue] = useState<RatingCpo>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: RatingCpo) {
    if (next === value || isPending) return;
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await updateDoctorRating(doctorId, next);
      if (result?.error) {
        setValue(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink/50">
        Αξιολόγηση πελατολογίου (CPO)
      </p>
      <div className="flex flex-wrap gap-2">
        {RATING_CPO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.description}
            disabled={isPending}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-opacity",
              value === opt.value
                ? TONE_CLASSES[opt.value]
                : "bg-ink/5 text-ink/60 hover:bg-ink/10",
              isPending && "opacity-60",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
