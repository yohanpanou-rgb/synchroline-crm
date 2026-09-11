"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function DoctorsSearchBar({
  initialQuery,
  regions,
  initialRegion,
  reps,
  initialRep,
  noRegionCount,
  noRegionValue,
}: {
  initialQuery: string;
  regions: string[];
  initialRegion: string;
  reps?: { id: string; full_name: string }[];
  initialRep?: string;
  /** Manager only -- πλήθος γιατρών χωρίς περιοχή· undefined = μην εμφανιστεί η επιλογή. */
  noRegionCount?: number;
  noRegionValue?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: { q?: string; region?: string; rep?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/doctors?${params.toString()}`);
    // Οι δύο selects είναι uncontrolled (defaultValue) -- χωρίς refresh() το
    // Next.js router cache μπορεί να δείξει προσωρινά μπαγιάτικα counts/λίστα
    // μέχρι το επόμενο πλήρες reload.
    router.refresh();
  }

  useEffect(() => {
    if (query === initialQuery) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: query }), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="mb-3 flex gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Αναζήτηση με επώνυμο ή όνομα…"
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <select
        defaultValue={initialRegion}
        onChange={(e) => pushParams({ region: e.target.value })}
        className="h-11 shrink-0 rounded-xl border border-black/10 bg-white px-3 text-sm text-ink"
      >
        <option value="">Όλες οι περιοχές</option>
        {!!noRegionCount && noRegionValue && (
          <option value={noRegionValue}>Χωρίς περιοχή ({noRegionCount})</option>
        )}
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {reps && reps.length > 0 && (
        <select
          defaultValue={initialRep ?? ""}
          onChange={(e) => pushParams({ rep: e.target.value })}
          className="h-11 shrink-0 rounded-xl border border-black/10 bg-white px-3 text-sm text-ink"
        >
          <option value="">Όλοι οι reps</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
