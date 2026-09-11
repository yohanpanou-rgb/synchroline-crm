"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface SearchableSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Combobox με client-side φιλτράρισμα πάνω σε ήδη φορτωμένη λίστα επιλογών
 * (χωρίς server round-trip) -- για πεδία με πολλές επιλογές (π.χ. "Κοντινός
 * γιατρός") όπου ένα απλό <select> είναι δύσχρηστο για αναζήτηση.
 */
export function SearchableSelect({
  name,
  options,
  defaultValue,
  placeholder = "Αναζήτηση…",
  emptyOptionLabel = "—",
}: {
  name: string;
  options: SearchableSelectOption[];
  defaultValue?: string | null;
  placeholder?: string;
  emptyOptionLabel?: string;
}) {
  const selectedDefault = options.find((o) => o.id === defaultValue);
  const [query, setQuery] = useState(selectedDefault?.label ?? "");
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("el");
    if (!q) return options.slice(0, 50);
    return options
      .filter((o) => o.label.toLocaleLowerCase("el").includes(q))
      .slice(0, 50);
  }, [query, options]);

  function select(option: SearchableSelectOption | null) {
    if (option) {
      setQuery(option.label);
      setValue(option.id);
    } else {
      setQuery("");
      setValue("");
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setValue("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-ink placeholder:text-ink/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <input type="hidden" name={name} value={value} />

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => select(null)}
            className={cn(
              "flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ink/5",
              !value && "font-medium text-primary",
            )}
          >
            {emptyOptionLabel}
          </button>
          {filtered.length === 0 && (
            <p className="px-2 py-2 text-xs text-ink/40">Καμία αντιστοιχία.</p>
          )}
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => select(o)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ink/5",
                value === o.id && "bg-primary/5 font-medium text-primary",
              )}
            >
              <span className="truncate">{o.label}</span>
              {o.sublabel && (
                <span className="shrink-0 text-xs text-ink/40">{o.sublabel}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
