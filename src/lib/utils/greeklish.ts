/**
 * Μετατρέπει Greeklish (λατινικό, φωνητικό πληκτρολόγημα) ή μικτό/πεζό
 * ελληνικό κείμενο σε ΚΑΝΟΝΙΚΟ ΕΛΛΗΝΙΚΟ ΚΕΦΑΛΑΙΟ, χωρίς τόνους -- η μορφή
 * που χρησιμοποιεί ήδη το CRM για region/county (π.χ. "ΑΘΗΝΑ", "ΣΥΓΓΡΟΣ").
 * Η μετατροπή greeklish->ελληνικά είναι εγγενώς ασαφής (δεν υπάρχει 1-1
 * αντιστοιχία) -- καλύπτει τους πιο κοινούς φωνητικούς συνδυασμούς, αρκετό
 * ώστε το επόμενο fuzzy search να βρει το σωστό ταίριασμα.
 */

const DIGRAPHS: [RegExp, string][] = [
  [/th/gi, "Θ"],
  [/ps/gi, "Ψ"],
  [/ks/gi, "Ξ"],
  [/ch/gi, "Χ"],
  [/mp/gi, "ΜΠ"],
  [/nt/gi, "ΝΤ"],
  [/gg/gi, "ΓΓ"],
  [/gk/gi, "ΓΚ"],
  [/ou/gi, "ΟΥ"],
  [/ai/gi, "ΑΙ"],
  [/ei/gi, "ΕΙ"],
  [/oi/gi, "ΟΙ"],
  [/yi/gi, "ΥΙ"],
  [/ui/gi, "ΥΙ"],
  [/af/gi, "ΑΥ"],
  [/av/gi, "ΑΥ"],
  [/ef/gi, "ΕΥ"],
  [/ev/gi, "ΕΥ"],
];

const SINGLE_LETTERS: Record<string, string> = {
  a: "Α",
  b: "Β",
  c: "Κ",
  d: "Δ",
  e: "Ε",
  f: "Φ",
  g: "Γ",
  h: "Η",
  i: "Ι",
  j: "Ζ",
  k: "Κ",
  l: "Λ",
  m: "Μ",
  n: "Ν",
  o: "Ο",
  p: "Π",
  q: "Κ",
  r: "Ρ",
  s: "Σ",
  t: "Τ",
  u: "Υ",
  v: "Β",
  w: "Ω",
  x: "Ξ",
  y: "Υ",
  z: "Ζ",
};

const ACCENT_MAP: Record<string, string> = {
  Ά: "Α",
  Έ: "Ε",
  Ή: "Η",
  Ί: "Ι",
  Ό: "Ο",
  Ύ: "Υ",
  Ώ: "Ω",
  Ϊ: "Ι",
  Ϋ: "Υ",
  ά: "α",
  έ: "ε",
  ή: "η",
  ί: "ι",
  ό: "ο",
  ύ: "υ",
  ώ: "ω",
  ϊ: "ι",
  ϋ: "υ",
};

function stripGreekAccents(text: string): string {
  return text.replace(/[ΆΈΉΊΌΎΏΪΫάέήίόύώϊϋ]/g, (c) => ACCENT_MAP[c] ?? c);
}

function transliterateGreeklishWord(word: string): string {
  let result = word;
  for (const [pattern, replacement] of DIGRAPHS) {
    result = result.replace(pattern, replacement);
  }
  result = result.replace(/[a-zA-Z]/g, (c) => SINGLE_LETTERS[c.toLowerCase()] ?? c);
  return result;
}

/**
 * true αν το κείμενο περιέχει λατινικούς χαρακτήρες (άρα χρειάζεται
 * greeklish transliteration πριν αποθηκευτεί/αναζητηθεί).
 */
export function looksLikeGreeklish(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

/** Κανονικοποίηση προς αποθήκευση: ΕΛΛΗΝΙΚΑ ΚΕΦΑΛΑΙΑ, χωρίς τόνους. */
export function toGreekUpper(text: string): string {
  const transliterated = looksLikeGreeklish(text) ? transliterateGreeklishWord(text) : text;
  return stripGreekAccents(transliterated).toLocaleUpperCase("el-GR").trim();
}
