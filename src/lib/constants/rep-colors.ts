/** Σταθερή παλέτα χρωμάτων ανά rep για τον χάρτη territories (§5.3 spec). */
const PALETTE = [
  "#2563eb", // μπλε
  "#dc2626", // κόκκινο
  "#16a34a", // πράσινο
  "#d97706", // πορτοκαλί
  "#7c3aed", // μωβ
  "#0891b2", // τιρκουάζ
  "#db2777", // ροζ
  "#65a30d", // λαχανί
];

const NO_REP_COLOR = "#94a3b8"; // γκρι -- περιοχή χωρίς ανατεθειμένο rep

/** repId -> χρώμα, με βάση σταθερή (αλφαβητική) σειρά reps -- ίδιο χρώμα σε κάθε φόρτωση. */
export function buildRepColorMap(reps: { id: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  reps.forEach((rep, i) => {
    map[rep.id] = PALETTE[i % PALETTE.length]!;
  });
  return map;
}

export function colorForRep(repId: string | null, colorMap: Record<string, string>): string {
  if (!repId) return NO_REP_COLOR;
  return colorMap[repId] ?? NO_REP_COLOR;
}
