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
 * γιατρός", "Περιοχή") όπου ένα απλό <select> είναι δύσχρηστο για αναζήτηση.
 *
 * Δύο τρόποι χρήσης:
 * - Μέσα σε <form>: δώσε `name` (+ προαιρετικά `defaultValue`) -- υποβάλλει
 *   κρυφό input, ίδιο pattern με ένα απλό uncontrolled <select>.
 * - Controlled (π.χ. φίλτρο που πλοηγεί άμεσα): δώσε `value` + `onChange` --
 *   ενημερώνεται από τον γονέα, καμία εσωτερική κατάσταση επιλογής.
 */
export function SearchableSelect({
  name,
  options,
  defaultValue,
  value: controlledValue,
  onChange,
  placeholder = "Αναζήτηση…",
  emptyOptionLabel = "—",
}: {
  name?: string;
  options: SearchableSelectOption[];
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (id: string) => void;
  placeholder?: string;
  emptyOptionLabel?: string;
}) {
  const isControlled = controlledValue !== undefined;
  const initialValue = (isControlled ? controlledValue : defaultValue) ?? "";
  const initialLabel = options.find((o) => o.id === initialValue)?.label ?? "";

  const [query, setQuery] = useState(initialLabel);
  const [internalValue, setInternalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const value = isControlled ? (controlledValue ?? "") : internalValue;

  // Όταν αλλάζει το controlled value απ' έξω (π.χ. ο χρήστης άλλαξε άλλο
  // φίλτρο και το URL ξαναφορτώθηκε), συγχρόνισε το ορατό κείμενο.
  useEffect(() => {
    if (!isControlled) return;
    const label = options.find((o) => o.id === controlledValue)?.label ?? "";
    setQuery(label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledValue]);

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
    const id = option?.id ?? "";
    setQuery(option?.label ?? "");
    if (!isControlled) setInternalValue(id);
    onChange?.(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!isControlled) setInternalValue("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-ink placeholder:text-ink/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {name && <input type="hidden" name={name} value={value} />}

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
