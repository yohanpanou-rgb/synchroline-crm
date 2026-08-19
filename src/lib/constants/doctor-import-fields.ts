export interface DoctorImportField {
  key: string;
  label: string;
  special?: "rep";
  enumValues?: string[];
}

/**
 * Εξαιρούνται σκόπιμα τα οικονομικά πεδία (budget/incentive/disbursed) —
 * βγήκαν από το προϊόν, δεν εισάγονται ποτέ ξανά μέσω αυτού του εργαλείου.
 */
export const DOCTOR_IMPORT_FIELDS: DoctorImportField[] = [
  { key: "full_name", label: "Ονοματεπώνυμο (υποχρεωτικό)" },
  { key: "region", label: "Περιοχή" },
  { key: "county", label: "Νομός / Πόλη" },
  { key: "brick_code", label: "Κωδικός brick" },
  { key: "rep", label: "Rep (ανάθεση)", special: "rep" },
  { key: "rating_cpo", label: "Αξιολόγηση (CPO)", enumValues: ["0", "1", "2", "3", "ΥΔ"] },
  { key: "specialty", label: "Ειδικότητα" },
  { key: "phone_1", label: "Τηλέφωνο 1" },
  { key: "phone_2", label: "Τηλέφωνο 2" },
  { key: "address", label: "Διεύθυνση" },
  { key: "notes", label: "Σημειώσεις" },
  { key: "hq_type", label: "Έδρα / Επαρχία", enumValues: ["ΕΔΡΑ", "ΕΠΑΡΧΙΑ"] },
  { key: "dynamic_category", label: "Δυναμική κατηγορία", enumValues: ["Α", "Β", "Γ"] },
  { key: "pharmacy_1", label: "Φαρμακείο 1" },
  { key: "pharmacy_2", label: "Φαρμακείο 2" },
];
