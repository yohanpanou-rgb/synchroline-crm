export const COMPETITOR_BRANDS = [
  "Avène",
  "Ducray",
  "A-Derma",
  "Bioderma",
  "La Roche-Posay",
  "Frezyderm",
  "SVR",
  "Boderm",
  "Rilastil",
  "Froika",
  "Uriage",
] as const;

export const COMPETITOR_CATEGORIES = [
  "ΑΚΜΗ",
  "ΡΟΔΟΧΡΟΥΣ",
  "ΑΤΟΠΙΚΗ ΔΕΡΜΑΤΙΤΙΔΑ",
  "ΣΜΗΓΜΑΤΟΡΡΟΪΚΗ ΔΕΡΜΑΤΙΤΙΔΑ",
  "ΑΝΑΠΛΑΣΗ/ΑΝΤΙΓΗΡΑΝΣΗ",
] as const;

export type CompetitorCategory = (typeof COMPETITOR_CATEGORIES)[number];
