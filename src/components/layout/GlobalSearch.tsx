"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type GlobalSearchResult } from "@/app/(app)/actions";

const KIND_LABEL: Record<GlobalSearchResult["kind"], string> = {
  doctor: "Γιατρός",
  pharmacy: "Φαρμακείο",
  institution: "Νοσοκομείο",
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const found = await globalSearch(query);
      setResults(found);
      setLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goTo(result: GlobalSearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  }

  return (
    <div ref={boxRef} className="relative hidden w-56 sm:block md:w-72">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Αναζήτηση γιατρού, φαρμακείου…"
        className="h-10 w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 text-sm text-ink focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {loading && <p className="px-3 py-2.5 text-xs text-ink/50">Αναζήτηση…</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-ink/50">Δεν βρέθηκαν αποτελέσματα.</p>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={`${r.kind}-${r.id}`}
                type="button"
                onClick={() => goTo(r)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-ink/5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{r.label}</span>
                  {r.sublabel && (
                    <span className="block truncate text-xs text-ink/50">{r.sublabel}</span>
                  )}
                </span>
                <span className="shrink-0 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-medium text-ink/50">
                  {KIND_LABEL[r.kind]}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
