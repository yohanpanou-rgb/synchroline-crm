"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { TIME_SLOTS } from "@/lib/constants/schedule";
import { DoctorCombobox } from "@/components/visits/DoctorCombobox";
import { COMPETITOR_BRANDS, COMPETITOR_CATEGORIES } from "@/lib/constants/competitors";
import type { ProductName, VisitStatus, VisitType } from "@/lib/types/database.types";

interface DoctorOption {
  id: string;
  last_name: string;
  first_name: string;
  institution?: string | null;
}
interface RepOption {
  id: string;
  full_name: string;
}

const PRODUCTS = [
  { key: "aknicare", label: "Aknicare" },
  { key: "closebax", label: "Closebax" },
  { key: "terproline", label: "Terproline" },
  { key: "rosacure", label: "Rosacure" },
] as const;

const NOTE_TEMPLATES = [
  "Συζητήθηκε Aknicare",
  "Συζητήθηκε Closebax",
  "Συζητήθηκε Terproline",
  "Συζητήθηκε Rosacure",
  "Ζήτησε δείγματα",
  "Θετική ανταπόκριση",
  "Να ξαναπεραστεί σύντομα",
];

export interface VisitFormValues {
  doctor_id: string;
  rep_id: string;
  visit_type: VisitType;
  status: VisitStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  completed_date: string | null;
  notes: string | null;
  location_context: string | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

export function VisitForm({
  action,
  doctors,
  reps,
  defaultDoctorId,
  defaultDate,
  defaultTime,
  defaultStatus,
  cycleId,
  cycleName,
  visit,
  doctorName,
  products,
  existingCompetitors,
  submitLabel = "Καταχώρηση επίσκεψης",
}: {
  action: (formData: FormData) => void | Promise<void>;
  doctors: DoctorOption[];
  reps?: RepOption[];
  defaultDoctorId?: string;
  defaultDate?: string;
  defaultTime?: string;
  defaultStatus?: VisitStatus;
  cycleId?: string;
  cycleName?: string;
  visit?: VisitFormValues;
  doctorName?: string;
  products?: Partial<Record<ProductName, { samples_given: number; notes: string | null }>>;
  existingCompetitors?: { category: string; competitorName: string }[];
  submitLabel?: string;
}) {
  const isEdit = !!visit;
  const [status, setStatus] = useState<VisitStatus>(visit?.status ?? defaultStatus ?? "planned");
  const [notes, setNotes] = useState(visit?.notes ?? "");

  function addTemplate(phrase: string) {
    setNotes((prev) => (prev.trim() ? `${prev.trim()}. ${phrase}` : phrase));
  }

  const [competitorCategory, setCompetitorCategory] = useState(
    existingCompetitors?.[0]?.category ?? "",
  );
  const [competitorBrands, setCompetitorBrands] = useState<Set<string>>(
    new Set(existingCompetitors?.map((c) => c.competitorName) ?? []),
  );
  const [competitorOther, setCompetitorOther] = useState(
    existingCompetitors?.find((c) => !COMPETITOR_BRANDS.includes(c.competitorName as never))
      ?.competitorName ?? "",
  );

  function toggleBrand(brand: string) {
    setCompetitorBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const scheduledDefault = visit?.scheduled_date ?? defaultDate ?? today;
  const completedDefault = visit?.completed_date ?? visit?.scheduled_date ?? today;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="cycle_id" value={cycleId ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        {isEdit ? (
          <div className="sm:col-span-2">
            <Field label="Γιατρός">
              <input type="hidden" name="doctor_id" value={visit.doctor_id} />
              <p className="flex h-11 items-center text-sm font-medium text-ink">
                {doctorName ?? "—"}
              </p>
            </Field>
          </div>
        ) : (
          <Field label="Γιατρός">
            <DoctorCombobox name="doctor_id" doctors={doctors} defaultDoctorId={defaultDoctorId} />
          </Field>
        )}

        {reps && (
          <Field label="Rep">
            <Select name="rep_id" defaultValue={visit?.rep_id ?? ""}>
              <option value="">Εγώ</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.full_name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Τύπος επίσκεψης">
          <Select name="visit_type" defaultValue={visit?.visit_type ?? "normal"}>
            <option value="normal">Κανονική</option>
            <option value="joint">Κοινή (joint)</option>
          </Select>
        </Field>

        <Field label="Κατάσταση">
          <Select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as VisitStatus)}
          >
            <option value="planned">Προγραμματισμένη</option>
            <option value="completed">Ολοκληρωμένη</option>
            <option value="cancelled">Ακυρωμένη</option>
          </Select>
        </Field>

        <Field label="Ημερομηνία επίσκεψης">
          <Input
            type="date"
            name="scheduled_date"
            defaultValue={scheduledDefault}
            required
          />
        </Field>

        <Field label="Ώρα">
          <Select
            name="scheduled_time"
            defaultValue={visit?.scheduled_time?.slice(0, 5) ?? defaultTime ?? ""}
          >
            <option value="">—</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        {status === "completed" && (
          <Field label="Ημερομηνία ολοκλήρωσης">
            <Input
              type="date"
              name="completed_date"
              defaultValue={completedDefault}
              required
            />
          </Field>
        )}

        <Field label="Πλαίσιο τοποθεσίας">
          <Input
            name="location_context"
            placeholder="π.χ. ιατρείο, νοσοκομείο"
            defaultValue={visit?.location_context ?? ""}
          />
        </Field>
      </div>

      <Field label="Σημειώσεις επίσκεψης">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {NOTE_TEMPLATES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addTemplate(t)}
              className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/60 hover:bg-ink/10"
            >
              + {t}
            </button>
          ))}
        </div>
        <Textarea
          name="notes"
          placeholder="Σχόλια, θέματα που συζητήθηκαν…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-primary-dark">
          Δείγματα ανά προϊόν
        </h3>
        <div className="space-y-3">
          {PRODUCTS.map((product) => (
            <div key={product.key} className="grid grid-cols-3 gap-3">
              <span className="col-span-1 flex items-center text-sm text-ink">
                {product.label}
              </span>
              <Input
                type="number"
                min="0"
                name={`samples_${product.key}`}
                placeholder="Δείγματα"
                className="col-span-1"
                defaultValue={products?.[product.key]?.samples_given ?? ""}
              />
              <Input
                name={`notes_${product.key}`}
                placeholder="Σημείωση (προαιρετικό)"
                className="col-span-1"
                defaultValue={products?.[product.key]?.notes ?? ""}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-primary-dark">
          Ανταγωνισμός
        </h3>
        <input type="hidden" name="competitor_category" value={competitorCategory} />
        <input type="hidden" name="competitor_brands" value={[...competitorBrands].join(",")} />
        <Field label="Κατηγορία πάθησης">
          <Select
            value={competitorCategory}
            onChange={(e) => setCompetitorCategory(e.target.value)}
          >
            <option value="">— Καμία —</option>
            {COMPETITOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        {competitorCategory && (
          <div className="mt-3">
            <p className="mb-1.5 text-sm font-medium text-ink">
              Ποια ανταγωνιστικά προϊόντα χρησιμοποιεί/ανέφερε ο γιατρός;
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COMPETITOR_BRANDS.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => toggleBrand(brand)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    competitorBrands.has(brand)
                      ? "bg-primary text-white"
                      : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
            <Input
              name="competitor_other"
              value={competitorOther}
              onChange={(e) => setCompetitorOther(e.target.value)}
              placeholder="Άλλο (προαιρετικό)"
              className="mt-2"
            />
          </div>
        )}
      </div>

      {cycleName && (
        <p className="text-xs text-ink/50">Κύκλος: {cycleName}</p>
      )}

      <Button type="submit" size="lg" disabled={!cycleId}>
        {submitLabel}
      </Button>
    </form>
  );
}
