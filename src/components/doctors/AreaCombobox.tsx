"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import {
  searchAreas,
  findSimilarAreas,
  createAreaSafe,
  type AreaSearchResult,
} from "@/app/(app)/doctors/actions";

/**
 * Combobox "Περιοχή" -- fuzzy/alias-aware αναζήτηση στον κανονικό κατάλογο
 * περιοχών (migration 0035), με dedup-guarded δημιουργία νέας περιοχής όταν
 * δεν βρεθεί ικανοποιητικό match. Υποβάλλει δύο πεδία: το ορατό "region"
 * (κανονικό, σωστά ορθογραφημένο όνομα -- ίδιο πεδίο με πριν, backward
 * compatible με dashboard/reports) και το κρυφό "area_id" (νέο, additive).
 */
export function AreaCombobox({
  defaultRegion,
  defaultAreaId,
}: {
  defaultRegion?: string | null;
  defaultAreaId?: string | null;
}) {
  const [query, setQuery] = useState(defaultRegion ?? "");
  const [areaId, setAreaId] = useState(defaultAreaId ?? "");
  const [results, setResults] = useState<AreaSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [similarOptions, setSimilarOptions] = useState<
    { id: string; canonical_name: string; score: number }[] | null
  >(null);
  const [pendingName, setPendingName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    setAreaId("");
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchAreas(value);
      setResults(data);
      setLoading(false);
    }, 250);
  }

  function selectArea(result: { id: string; canonical_name: string }) {
    setQuery(result.canonical_name);
    setAreaId(result.id);
    setResults([]);
    setOpen(false);
  }

  async function handleCreateClick() {
    const name = query.trim();
    if (!name) return;
    setLoading(true);
    const similar = await findSimilarAreas(name, 0.35);
    setLoading(false);
    if (similar.length > 0) {
      setPendingName(name);
      setSimilarOptions(similar);
      return;
    }
    await doCreate(name);
  }

  async function doCreate(name: string) {
    setLoading(true);
    const created = await createAreaSafe(name);
    setLoading(false);
    setSimilarOptions(null);
    if (created) selectArea({ id: created.id, canonical_name: created.canonical_name });
  }

  const exactMatch = results.some(
    (r) => r.canonical_name.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <div ref={ref} className="relative">
      <Input
        name="region"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="π.χ. Κολωνάκι"
        autoComplete="off"
      />
      <input type="hidden" name="area_id" value={areaId} />

      {open && query.trim() && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
          {loading && <p className="px-2 py-2 text-xs text-ink/40">Αναζήτηση…</p>}
          {!loading && results.length === 0 && (
            <p className="px-2 py-2 text-xs text-ink/40">Καμία περιοχή δεν βρέθηκε.</p>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectArea(r)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ink/5"
              >
                <span className="text-ink">{r.canonical_name}</span>
                {r.score < 1 && (
                  <span className="text-xs text-ink/40">{Math.round(r.score * 100)}%</span>
                )}
              </button>
            ))}
          {!loading && !exactMatch && (
            <button
              type="button"
              onClick={handleCreateClick}
              className="mt-1 flex w-full items-center gap-1.5 rounded-lg border-t border-black/5 px-2 py-2 text-left text-sm text-primary hover:bg-primary/5"
            >
              + Δημιουργία νέας περιοχής: «{query.trim()}»
            </button>
          )}
        </div>
      )}

      {similarOptions && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="mb-3 text-sm font-medium text-ink">
              Βρήκαμε παρόμοιες περιοχές με «{pendingName}»:
            </p>
            <div className="mb-3 space-y-1.5">
              {similarOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    selectArea(s);
                    setSimilarOptions(null);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-left text-sm hover:bg-ink/5"
                >
                  <span>{s.canonical_name}</span>
                  <span className="text-xs text-ink/40">{Math.round(s.score * 100)}%</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setSimilarOptions(null)}
                className="rounded-lg px-3 py-2 text-sm text-ink/50 hover:bg-ink/5"
              >
                Άκυρο
              </button>
              <button
                type="button"
                onClick={() => doCreate(pendingName)}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Δημιούργησε «{pendingName}» ούτως ή άλλως
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
