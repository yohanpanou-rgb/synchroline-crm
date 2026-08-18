import type { AuditEntry } from "@/lib/queries/audit";
import { formatDateGR } from "@/lib/constants/schedule";

const IGNORED_KEYS = new Set(["id", "created_at", "updated_at"]);

const FIELD_LABELS: Record<string, string> = {
  last_name: "Επώνυμο",
  first_name: "Όνομα",
  region: "Περιοχή",
  county: "Νομός / Πόλη",
  brick_code: "Brick",
  dynamic_category: "Δυναμική κατηγορία",
  priority_color: "Προτεραιότητα",
  current_rep_id: "Ανάθεση rep",
  status: "Κατάσταση",
  specialty: "Ειδικότητα",
  phone_1: "Τηλέφωνο 1",
  phone_2: "Τηλέφωνο 2",
  address: "Διεύθυνση",
  notes: "Σημειώσεις",
  hq_type: "Έδρα / Επαρχία",
  rating_cpo: "Αξιολόγηση (CPO)",
  pharmacy_1: "Φαρμακείο 1",
  pharmacy_2: "Φαρμακείο 2",
  doctor_id: "Γιατρός",
  rep_id: "Rep",
  cycle_id: "Κύκλος",
  visit_type: "Τύπος επίσκεψης",
  scheduled_date: "Προγραμματισμένη ημερομηνία",
  scheduled_time: "Ώρα",
  completed_date: "Ημερομηνία ολοκλήρωσης",
  location_context: "Σημείο επίσκεψης",
  target_visits: "Στόχος επισκέψεων",
  target_coverage_pct: "Στόχος κάλυψης %",
  valid_from: "Ισχύει από",
  valid_to: "Ισχύει έως",
  pharmacy_name: "Φαρμακείο",
  visit_date: "Ημερομηνία επίσκεψης",
};

const ACTION_LABEL: Record<AuditEntry["action"], string> = {
  insert: "Δημιουργία",
  update: "Ενημέρωση",
  delete: "Διαγραφή",
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function diffFields(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): { key: string; from: unknown; to: unknown }[] {
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const diffs: { key: string; from: unknown; to: unknown }[] = [];
  for (const key of keys) {
    if (IGNORED_KEYS.has(key)) continue;
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      diffs.push({ key, from: oldData[key], to: newData[key] });
    }
  }
  return diffs;
}

export function ActivityHistory({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-2 text-sm text-ink/50">Καμία καταγεγραμμένη αλλαγή ακόμα.</p>;
  }

  return (
    <div className="divide-y divide-black/5">
      {entries.map((entry) => {
        const diffs = entry.action === "update" ? diffFields(entry.oldData, entry.newData) : [];
        return (
          <div key={entry.id} className="py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink">
                {ACTION_LABEL[entry.action]} — {entry.changedByName ?? "άγνωστος"}
              </span>
              <span className="text-ink/50">
                {formatDateGR(entry.changedAt)}{" "}
                {new Date(entry.changedAt).toLocaleTimeString("el-GR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {diffs.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-xs text-ink/70">
                {diffs.map((d) => (
                  <li key={d.key}>
                    <span className="text-ink/50">{fieldLabel(d.key)}:</span>{" "}
                    {formatValue(d.from)} → {formatValue(d.to)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
