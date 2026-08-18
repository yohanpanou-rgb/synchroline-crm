import type { RatingCpo } from "@/lib/types/database.types";

export const RATING_CPO_OPTIONS: {
  value: RatingCpo;
  label: string;
  description: string;
}[] = [
  {
    value: "1",
    label: "Συνεργαζόμενος συνταγογράφος",
    description: "Σταθερή, ενεργή συνεργασία — συνταγογραφεί τακτικά.",
  },
  {
    value: "2",
    label: "Συνταγογράφος",
    description: "Συνταγογραφεί, χωρίς τη σταθερότητα του συνεργαζόμενου.",
  },
  {
    value: "3",
    label: "Περιστασιακός συνταγογράφος",
    description: "Συνταγογραφεί περιστασιακά / σποραδικά.",
  },
  {
    value: "0",
    label: "Χωρίς επίσκεψη",
    description: "Δεν έχει πραγματοποιηθεί ακόμα επίσκεψη.",
  },
  {
    value: "ΥΔ",
    label: "Υπό διερεύνηση",
    description: "Δεν έχει αξιολογηθεί ακόμα (προεπιλογή).",
  },
];

export const RATING_CPO_LABEL: Record<RatingCpo, string> = Object.fromEntries(
  RATING_CPO_OPTIONS.map((o) => [o.value, o.label]),
) as Record<RatingCpo, string>;

/** rating_cpo values που θεωρούνται "ενεργός" γιατρός για μετρήσεις κάλυψης. */
export const ACTIVE_RATINGS: RatingCpo[] = ["1", "2", "3"];

/** Πάνω από αυτό το ποσοστό ΥΔ στο πελατολόγιο, εμφανίζεται κόκκινο badge. */
export const RATING_CPO_ALERT_THRESHOLD_PCT = 15;
