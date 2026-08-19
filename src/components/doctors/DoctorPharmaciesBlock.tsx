"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { DoctorPharmacyLink } from "@/lib/queries/doctor-pharmacies";
import {
  searchPharmacies,
  linkExistingPharmacy,
  createAndLinkPharmacy,
  unlinkPharmacy,
  setPrimaryPharmacy,
  type PharmacySearchResult,
} from "@/app/(app)/doctors/pharmacy-actions";

export function DoctorPharmaciesBlock({
  doctorId,
  initialLinks,
}: {
  doctorId: string;
  initialLinks: DoctorPharmacyLink[];
}) {
  const [links, setLinks] = useState(initialLinks);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PharmacySearchResult[]>([]);
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
      const found = await searchPharmacies(query);
      setResults(found);
      setSearching(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const linkedIds = new Set(links.map((l) => l.pharmacy.id));
  const exactMatch = results.some((r) => r.name.toUpperCase() === query.trim().toUpperCase());

  async function handleLink(pharmacy: PharmacySearchResult) {
    setBusy(true);
    setError(null);
    const result = await linkExistingPharmacy(doctorId, pharmacy.id);
    if (result.error) {
      setError(result.error);
    } else {
      setLinks((prev) => [...prev, { linkId: crypto.randomUUID(), role: "secondary", pharmacy }]);
      setQuery("");
      setResults([]);
    }
    setBusy(false);
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const name = query.trim();
    const result = await createAndLinkPharmacy(doctorId, name, null);
    if (result.error) {
      setError(result.error);
    } else {
      setLinks((prev) => [
        ...prev,
        { linkId: crypto.randomUUID(), role: "secondary", pharmacy: { id: crypto.randomUUID(), name, city: null } },
      ]);
      setQuery("");
      setResults([]);
    }
    setBusy(false);
  }

  async function handleUnlink(linkId: string) {
    setBusy(true);
    setError(null);
    const result = await unlinkPharmacy(doctorId, linkId);
    if (result.error) {
      setError(result.error);
    } else {
      setLinks((prev) => prev.filter((l) => l.linkId !== linkId));
    }
    setBusy(false);
  }

  async function handleSetPrimary(linkId: string) {
    setBusy(true);
    setError(null);
    const result = await setPrimaryPharmacy(doctorId, linkId);
    if (result.error) {
      setError(result.error);
    } else {
      setLinks((prev) =>
        prev
          .map((l) => ({ ...l, role: l.linkId === linkId ? ("primary" as const) : ("secondary" as const) }))
          .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1)),
      );
    }
    setBusy(false);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink/50">Φαρμακεία</p>

      {links.length === 0 && (
        <p className="mb-3 text-sm text-ink/50">Δεν υπάρχει συνδεδεμένο φαρμακείο.</p>
      )}

      <div className="mb-3 space-y-1.5">
        {links.map((l) => (
          <div
            key={l.linkId}
            className="flex items-center justify-between gap-2 rounded-lg bg-ink/5 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{l.pharmacy.name}</p>
              {l.pharmacy.city && <p className="truncate text-xs text-ink/50">{l.pharmacy.city}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {l.role === "primary" ? (
                <Badge tone="success">Κύριο</Badge>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSetPrimary(l.linkId)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ορισμός κύριου
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => handleUnlink(l.linkId)}
                className="text-xs font-medium text-danger hover:underline"
              >
                Αφαίρεση
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Αναζήτηση φαρμακείου…"
          disabled={busy}
        />
        {query.trim() && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-black/10 bg-white shadow-lg">
            {searching && <p className="px-3 py-2 text-xs text-ink/50">Αναζήτηση…</p>}
            {!searching &&
              results
                .filter((r) => !linkedIds.has(r.id))
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleLink(r)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-ink/5"
                  >
                    {r.name}
                    {r.city && <span className="text-ink/50"> · {r.city}</span>}
                  </button>
                ))}
            {!searching && !exactMatch && (
              <button
                type="button"
                disabled={busy}
                onClick={handleCreate}
                className="block w-full border-t border-black/5 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-primary/5"
              >
                + Δημιουργία νέου: «{query.trim()}»
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
