"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import {
  searchAssignableDoctors,
  assignDoctorToInstitution,
  type DoctorSearchResult,
} from "@/app/(app)/hospitals/actions";

export function AssignDoctorWidget({ institution }: { institution: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DoctorSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const found = await searchAssignableDoctors(query);
      setResults(found);
      setSearching(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleAssign(doctorId: string) {
    setBusy(true);
    setError(null);
    const result = await assignDoctorToInstitution(doctorId, institution);
    if (result.error) {
      setError(result.error);
    } else {
      setQuery("");
      setResults([]);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Αναζήτηση υπάρχοντος γιατρού…"
        disabled={busy}
      />
      {query.trim() && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-black/10 bg-white shadow-lg">
          {searching && <p className="px-3 py-2 text-xs text-ink/50">Αναζήτηση…</p>}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink/50">Δεν βρέθηκε γιατρός χωρίς νοσοκομείο.</p>
          )}
          {!searching &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={busy}
                onClick={() => handleAssign(r.id)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-ink/5"
              >
                {r.name}
                {r.region && <span className="text-ink/50"> · {r.region}</span>}
              </button>
            ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
