import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { formatDoctorName } from "@/lib/utils/name-normalization";

interface DoctorOption {
  id: string;
  last_name: string;
  first_name: string;
}
interface RepOption {
  id: string;
  full_name: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

export function PharmacyVisitForm({
  action,
  doctors,
  reps,
  cycleId,
  cycleName,
  defaultValues,
  submitLabel = "Καταχώρηση",
}: {
  action: (formData: FormData) => void | Promise<void>;
  doctors: DoctorOption[];
  reps?: RepOption[];
  cycleId?: string;
  cycleName?: string;
  defaultValues?: {
    pharmacy_name: string;
    visit_date: string;
    nearby_doctor_id: string | null;
    notes: string;
    rep_id?: string;
  };
  submitLabel?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="cycle_id" value={cycleId ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Φαρμακείο">
          <Input
            name="pharmacy_name"
            required
            defaultValue={defaultValues?.pharmacy_name ?? ""}
            placeholder="π.χ. Φαρμακείο Παπαδοπούλου"
          />
        </Field>

        <Field label="Ημερομηνία">
          <Input
            type="date"
            name="visit_date"
            defaultValue={defaultValues?.visit_date ?? today}
            required
          />
        </Field>

        {reps && (
          <Field label="Rep">
            <Select name="rep_id" defaultValue={defaultValues?.rep_id ?? ""}>
              <option value="">Εγώ</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.full_name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Κοντινός γιατρός (προαιρετικό)">
          <Select
            name="nearby_doctor_id"
            defaultValue={defaultValues?.nearby_doctor_id ?? ""}
          >
            <option value="">—</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {formatDoctorName(doctor.last_name, doctor.first_name)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Σημειώσεις (υποχρεωτικό)">
        <Textarea
          name="notes"
          required
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Τι συζητήθηκε, παρατηρήσεις…"
        />
      </Field>

      {cycleName && <p className="text-xs text-ink/50">Κύκλος: {cycleName}</p>}

      <Button type="submit" size="lg" disabled={!cycleId}>
        {submitLabel}
      </Button>
    </form>
  );
}
