"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import type { VisitStatus } from "@/lib/types/database.types";

interface DoctorOption {
  id: string;
  last_name: string;
  first_name: string;
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
  cycleId,
  cycleName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  doctors: DoctorOption[];
  reps?: RepOption[];
  defaultDoctorId?: string;
  cycleId?: string;
  cycleName?: string;
}) {
  const [status, setStatus] = useState<VisitStatus>("planned");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="cycle_id" value={cycleId ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Γιατρός">
          <Select name="doctor_id" required defaultValue={defaultDoctorId ?? ""}>
            <option value="" disabled>
              Επίλεξε γιατρό
            </option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {formatDoctorName(doctor.last_name, doctor.first_name)}
              </option>
            ))}
          </Select>
        </Field>

        {reps && (
          <Field label="Rep">
            <Select name="rep_id" defaultValue="">
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
          <Select name="visit_type" defaultValue="normal">
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
          </Select>
        </Field>

        <Field label="Ημερομηνία">
          <Input
            type="date"
            name={status === "completed" ? "completed_date" : "scheduled_date"}
            defaultValue={today}
            required
          />
        </Field>

        <Field label="Πλαίσιο τοποθεσίας">
          <Input name="location_context" placeholder="π.χ. ιατρείο, νοσοκομείο" />
        </Field>
      </div>

      <Field label="Σημειώσεις επίσκεψης">
        <Textarea name="notes" placeholder="Σχόλια, θέματα που συζητήθηκαν…" />
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
              />
              <Input
                name={`notes_${product.key}`}
                placeholder="Σημείωση (προαιρετικό)"
                className="col-span-1"
              />
            </div>
          ))}
        </div>
      </div>

      {cycleName && (
        <p className="text-xs text-ink/50">Κύκλος: {cycleName}</p>
      )}

      <Button type="submit" size="lg" disabled={!cycleId}>
        Καταχώρηση επίσκεψης
      </Button>
    </form>
  );
}
