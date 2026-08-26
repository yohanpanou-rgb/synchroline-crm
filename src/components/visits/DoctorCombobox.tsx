"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDoctorName } from "@/lib/utils/name-normalization";

interface DoctorOption {
  id: string;
  last_name: string;
  first_name: string;
  institution?: string | null;
}

function normalize(s: string) {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Αντικαθιστά το native <select> επιλογής γιατρού (feedback Σάββα, #5): η
 * αναζήτηση σε native select γίνεται μόνο με το πρώτο γράμμα. Εδώ
 * πληκτρολογείς οποιοδήποτε κομμάτι επωνύμου/ονόματος, με προαιρετικό
 * φίλτρο νοσοκομείου (#3) όταν ξέρεις πού πας αλλά όχι ποιον θα δεις.
 */
export function DoctorCombobox({
  name,
  doctors,
  defaultDoctorId,
}: {
  name: string;
  doctors: DoctorOption[];
  defaultDoctorId?: string;
}) {
  const initial = doctors.find((d) => d.id === defaultDoctorId);
  const [selectedId, setSelectedId] = useState(defaultDoctorId ?? "");
  const [query, setQuery] = useState(
    initial ? formatDoctorName(initial.last_name, initial.first_name) : "",
  );
  const [hospitalFilter, setHospitalFilter] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hospitals = useMemo(
    () => [...new Set(doctors.map((d) => d.institution).filter((v): v is string => !!v))].sort(),
    [doctors],
  );

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return doctors
      .filter((d) => !hospitalFilter || d.institution === hospitalFilter)
      .filter((d) => {
        if (!q) return true;
        const full = normalize(`${d.last_name} ${d.first_name}`);
        return full.includes(q);
      })
      .slice(0, 50);
  }, [doctors, query, hospitalFilter]);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Πληκτρολόγησε επώνυμο ή όνομα…"
        autoComplete="off"
      />
      {hospitals.length > 0 && (
        <Select
          className="mt-2"
          value={hospitalFilter}
          onChange={(e) => setHospitalFilter(e.target.value)}
        >
          <option value="">Όλα τα νοσοκομεία / προσωπικό πελατολόγιο</option>
          {hospitals.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </Select>
      )}
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg">
          {results.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink/50">Δεν βρέθηκε γιατρός.</p>
          )}
          {results.map((d) => (
            <button
              key={d.id}
              type="button"
              onMouseDown={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
                setSelectedId(d.id);
                setQuery(formatDoctorName(d.last_name, d.first_name));
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-ink/5"
            >
              {formatDoctorName(d.last_name, d.first_name)}
              {d.institution && <span className="text-ink/50"> · {d.institution}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
