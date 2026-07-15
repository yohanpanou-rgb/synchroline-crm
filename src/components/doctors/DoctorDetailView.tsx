import { Badge } from "@/components/ui/Badge";
import type { Database } from "@/lib/types/database.types";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 py-2.5 last:border-0">
      <span className="text-sm text-ink/50">{label}</span>
      <span className="text-sm font-medium text-ink">{value ?? "—"}</span>
    </div>
  );
}

export function DoctorDetailView({ doctor }: { doctor: Doctor }) {
  return (
    <div className="space-y-4">
      <div>
        <Row label="Περιοχή" value={doctor.region} />
        <Row label="Νομός / Πόλη" value={doctor.county} />
        <Row label="Ειδικότητα" value={doctor.specialty} />
        <Row
          label="Έδρα / Επαρχία"
          value={
            doctor.hq_type === "ΕΔΡΑ"
              ? "Έδρα"
              : doctor.hq_type === "ΕΠΑΡΧΙΑ"
                ? "Επαρχία"
                : null
          }
        />
        <Row label="Τηλέφωνο 1" value={doctor.phone_1} />
        <Row label="Τηλέφωνο 2" value={doctor.phone_2} />
        <Row label="Διεύθυνση" value={doctor.address} />
        <Row label="Δυναμική κατηγορία" value={doctor.dynamic_category} />
        <Row
          label="Προτεραιότητα"
          value={
            doctor.priority_color && (
              <Badge
                tone={
                  doctor.priority_color === "green"
                    ? "success"
                    : doctor.priority_color === "orange"
                      ? "warning"
                      : "danger"
                }
              >
                {doctor.priority_color}
              </Badge>
            )
          }
        />
        <Row label="Φαρμακείο 1" value={doctor.pharmacy_1} />
        <Row label="Φαρμακείο 2" value={doctor.pharmacy_2} />
        <Row label="Σημειώσεις" value={doctor.notes} />
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-primary-dark">
          Εβδομαδιαίες συνταγές
        </h3>
        <Row label="Aknicare" value={doctor.weekly_rx_aknicare} />
        <Row label="Closebax" value={doctor.weekly_rx_closebax} />
        <Row label="Terproline" value={doctor.weekly_rx_terproline} />
        <Row label="Rosacure" value={doctor.weekly_rx_rosacure} />
      </div>
    </div>
  );
}
