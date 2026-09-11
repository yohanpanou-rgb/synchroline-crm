/**
 * Σταθερά, κατ' όνομα χρώματα rep για τον χάρτη territories (ζητήθηκε ρητά):
 * Θανάσης = κόκκινο, Αντώνης = κίτρινο, Ειρήνη = πράσινο, Ελεονώρα = μπλε,
 * Σάββας = μαύρο. Ταυτοποίηση με βάση το profiles.id (σταθερό στη βάση),
 * όχι το όνομα -- ανθεκτικό σε μελλοντικές αλλαγές στο full_name.
 */
const NAMED_REP_COLORS: Record<string, string> = {
  "4080f4ce-855a-4c35-9968-1318ce233608": "#DC2626", // Θανάσης Τζιατζιάφης — κόκκινο
  "b2ef4cbb-7c5c-4105-8aa1-7071b1e9e89b": "#EAB308", // Αντώνης Καφές — κίτρινο
  "59eecff0-db9e-4b12-84aa-1b2e84f4d6d9": "#16A34A", // Ειρήνη Γαβριηλίδου — πράσινο
  "3888bab8-3d3c-44e6-8b13-7275c4bb0732": "#2563EB", // Ελεονώρα Κωνσταντινίδη — μπλε
  "eb0558a7-84be-43f7-bd2f-2b0564aa75e6": "#171717", // Σάββας Φελουκίδης — μαύρο
};

/** Fallback παλέτα για οποιονδήποτε άλλο/μελλοντικό rep χωρίς ρητά ορισμένο χρώμα. */
const FALLBACK_PALETTE = ["#7C3AED", "#0891B2", "#DB2777", "#65A30D", "#EA580C"];

const NO_REP_COLOR = "#94a3b8"; // γκρι -- περιοχή χωρίς ανατεθειμένο rep

/** repId -> χρώμα. Ρητό όνομα αν υπάρχει, αλλιώς σταθερή παλέτα ανά σειρά (alphabetical). */
export function buildRepColorMap(reps: { id: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  let fallbackIndex = 0;
  reps.forEach((rep) => {
    if (NAMED_REP_COLORS[rep.id]) {
      map[rep.id] = NAMED_REP_COLORS[rep.id]!;
    } else {
      map[rep.id] = FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length]!;
      fallbackIndex++;
    }
  });
  return map;
}

export function colorForRep(repId: string | null, colorMap: Record<string, string>): string {
  if (!repId) return NO_REP_COLOR;
  return colorMap[repId] ?? NO_REP_COLOR;
}
