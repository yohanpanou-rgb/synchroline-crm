"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import {
  searchAreas,
  searchHospitals,
  findSimilarAreas,
  createAreaSafe,
  type AreaSearchResult,
  type HospitalSearchResult,
} from "@/app/(app)/doctors/actions";
import { toGreekUpper } from "@/lib/utils/greeklish";

/**
 * Combobox "Περιοχή" -- fuzzy/alias-aware αναζήτηση στον κανονικό κατάλογο
 * περιοχών (migration 0035/0036), με dedup-guarded δημιουργία νέας περιοχής
 * όταν δεν βρεθεί ικανοποιητικό match. Ό,τι γράψει ο χρήστης -- πεζά,
 * κεφαλαία, ή greeklish (π.χ. "Kolonaki") -- μετατρέπεται αυτόματα σε
 * ΕΛΛΗΝΙΚΑ ΚΕΦΑΛΑΙΑ πριν αναζητηθεί/αποθηκευτεί, ίδια σύμβαση με το
 * υπόλοιπο CRM. Υποβάλλει δύο πεδία: το ορατό "region" (κανονικό όνομα --
 * ίδιο πεδίο με πριν, backward compatible με dashboard/reports) και το
 * κρυφό "area_id" (νέο, additive).
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
  const [hospitalResults, setHospitalResults] = useState<HospitalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [similarOptions, setSimilarOptions] = useState<
    { id: string; canonical_name: string; score: number }[] | null
  >(null);
  const [pendingName, setPendingName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs ώστε ο document-level mousedown listener (registered μία φορά) να
  // βλέπει πάντα τις τελευταίες τιμές, χωρίς να ξανα-εγγράφεται σε κάθε change.
  const queryRef = useRef(query);
  const areaIdRef = useRef(areaId);
  queryRef.current = query;
  areaIdRef.current = areaId;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
      // Το πεδίο έχει κείμενο αλλά δεν έχει συνδεθεί ρητά με περιοχή (π.χ. ο
      // χρήστης δεν πάτησε ποτέ πρόταση) -- πριν κλείσει, δοκίμασε αυτόματη
      // σύνδεση αν το κείμενο ταιριάζει ήδη ακριβώς με υπάρχουσα περιοχή, και
      // πάντα κανονικοποίησε σε ΚΕΦΑΛΑΙΑ.
      const trimmed = queryRef.current.trim();
      if (!trimmed || areaIdRef.current) return;
      void (async () => {
        const normalized = toGreekUpper(trimmed);
        setQuery(normalized);
        const data = await searchAreas(normalized);
        const top = data[0];
        if (top && top.score >= 0.98) {
          selectArea(top);
        }
      })();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    setAreaId("");
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setHospitalResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const [areaData, hospitalData] = await Promise.all([
        searchAreas(value),
        searchHospitals(value),
      ]);
      setResults(areaData);
      setHospitalResults(hospitalData);
      setLoading(false);
    }, 250);
  }

  function selectArea(result: { id: string; canonical_name: string }) {
    setQuery(result.canonical_name);
    setAreaId(result.id);
    setResults([]);
    setHospitalResults([]);
    setOpen(false);
  }

  /** Νοσοκομεία δεν έχουν συντεταγμένες στον κατάλογο περιοχών -- γεμίζει
   * μόνο το ελεύθερο κείμενο region, χωρίς area_id. */
  function selectHospital(name: string) {
    setQuery(name);
    setAreaId("");
    setResults([]);
    setHospitalResults([]);
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

  const normalizedQuery = toGreekUpper(query);
  const exactMatch = results.some((r) => r.canonical_name === normalizedQuery);

  return (
    <div ref={ref} className="relative">
      <Input
        name="region"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="π.χ. Κολωνάκι ή Kolonaki"
        autoComplete="off"
      />
      <input type="hidden" name="area_id" value={areaId} />

      {open && query.trim() && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
          {loading && <p className="px-2 py-2 text-xs text-ink/40">Αναζήτηση…</p>}
          {!loading && results.length === 0 && hospitalResults.length === 0 && (
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
          {!loading &&
            hospitalResults.map((h) => (
              <button
                key={`hospital-${h.name}`}
                type="button"
                onClick={() => selectHospital(h.name)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ink/5"
              >
                <span className="shrink-0 text-xs text-ink/40">🏥 Νοσοκομείο</span>
                <span className="truncate text-ink">{h.name}</span>
              </button>
            ))}
          {!loading && !exactMatch && (
            <button
              type="button"
              onClick={handleCreateClick}
              className="mt-1 flex w-full items-center gap-1.5 rounded-lg border-t border-black/5 px-2 py-2 text-left text-sm text-primary hover:bg-primary/5"
            >
              + Δημιουργία νέας περιοχής: «{normalizedQuery}»
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
                Δημιούργησε «{toGreekUpper(pendingName)}» ούτως ή άλλως
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
