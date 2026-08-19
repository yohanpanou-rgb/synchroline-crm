import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/types/database.types";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

export function DoctorForm({
  action,
  isManager,
  doctor,
  reps,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  isManager: boolean;
  doctor?: Doctor;
  reps?: Pick<Profile, "id" | "full_name">[];
  submitLabel: string;
}) {
  const fullNameDefault =
    doctor?.full_name_raw ??
    [doctor?.last_name, doctor?.first_name].filter(Boolean).join(" ");

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Ονοματεπώνυμο γιατρού">
            <Input
              name="full_name_raw"
              required
              defaultValue={fullNameDefault}
              placeholder="π.χ. ΓΙΩΡΓΟΣ ΠΑΠΑΔΟΠΟΥΛΟΣ"
            />
          </Field>
        </div>

        <Field label="Περιοχή">
          <Input name="region" defaultValue={doctor?.region ?? ""} />
        </Field>
        <Field label="Νομός / Πόλη">
          <Input name="county" defaultValue={doctor?.county ?? ""} />
        </Field>

        <Field label="Ειδικότητα">
          <Input name="specialty" defaultValue={doctor?.specialty ?? ""} />
        </Field>
        <Field label="Έδρα / Επαρχία">
          <Select name="hq_type" defaultValue={doctor?.hq_type ?? ""}>
            <option value="">—</option>
            <option value="ΕΔΡΑ">Έδρα</option>
            <option value="ΕΠΑΡΧΙΑ">Επαρχία</option>
          </Select>
        </Field>

        <Field label="Τηλέφωνο 1">
          <Input name="phone_1" defaultValue={doctor?.phone_1 ?? ""} />
        </Field>
        <Field label="Τηλέφωνο 2">
          <Input name="phone_2" defaultValue={doctor?.phone_2 ?? ""} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Διεύθυνση">
            <Input name="address" defaultValue={doctor?.address ?? ""} />
          </Field>
        </div>

        <Field label="Δυναμική κατηγορία">
          <Select
            name="dynamic_category"
            defaultValue={doctor?.dynamic_category ?? ""}
          >
            <option value="">—</option>
            <option value="Α">Α</option>
            <option value="Β">Β</option>
            <option value="Γ">Γ</option>
          </Select>
        </Field>
        <Field label="Προτεραιότητα">
          <Select
            name="priority_color"
            defaultValue={doctor?.priority_color ?? ""}
          >
            <option value="">—</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </Select>
        </Field>

        <Field label="Φαρμακείο 1">
          <Input name="pharmacy_1" defaultValue={doctor?.pharmacy_1 ?? ""} />
        </Field>
        <Field label="Φαρμακείο 2">
          <Input name="pharmacy_2" defaultValue={doctor?.pharmacy_2 ?? ""} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Σημειώσεις">
            <Textarea name="notes" defaultValue={doctor?.notes ?? ""} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-primary-dark">
          Εβδομαδιαίες συνταγές
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Aknicare">
            <Input
              type="number"
              step="0.1"
              min="0"
              name="weekly_rx_aknicare"
              defaultValue={doctor?.weekly_rx_aknicare ?? ""}
            />
          </Field>
          <Field label="Closebax">
            <Input
              type="number"
              step="0.1"
              min="0"
              name="weekly_rx_closebax"
              defaultValue={doctor?.weekly_rx_closebax ?? ""}
            />
          </Field>
          <Field label="Terproline">
            <Input
              type="text"
              placeholder="π.χ. 8 ή 5-10"
              name="weekly_rx_terproline"
              defaultValue={doctor?.weekly_rx_terproline ?? ""}
            />
          </Field>
          <Field label="Rosacure">
            <Input
              type="number"
              step="0.1"
              min="0"
              name="weekly_rx_rosacure"
              defaultValue={doctor?.weekly_rx_rosacure ?? ""}
            />
          </Field>
        </div>
      </div>

      {isManager && (
        <>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-primary-dark">
              Brick (IMS/IQVIA)
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Κωδικός brick">
                <Input name="brick_code" defaultValue={doctor?.brick_code ?? ""} />
              </Field>
              <Field label="Όνομα brick">
                <Input name="brick_name" placeholder="προαιρετικό" />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Υπεύθυνος rep">
              <Select name="current_rep_id" defaultValue={doctor?.current_rep_id ?? ""}>
                <option value="">— Κανένας —</option>
                {reps?.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Κατάσταση">
              <Select name="status" defaultValue={doctor?.status ?? "pending_approval"}>
                <option value="pending_approval">Εκκρεμεί έγκριση</option>
                <option value="active">Ενεργός</option>
                <option value="archived">Αρχειοθετημένος</option>
              </Select>
            </Field>
          </div>
        </>
      )}

      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
