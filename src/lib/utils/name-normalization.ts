/**
 * Splits a raw "ΟΝΟΜΑΤΕΠΩΝΥΜΟ" value (Greek convention: first name(s) followed
 * by surname, e.g. "ΓΙΩΡΓΟΣ ΠΑΠΑΔΟΠΟΥΛΟΣ") into { last_name, first_name }.
 * The last whitespace-separated token is treated as the surname; everything
 * before it is the first name. The original raw string is always preserved
 * separately (doctors.full_name_raw) so this heuristic can be corrected by
 * hand without losing the source data.
 */
export function normalizeDoctorName(raw: string): {
  lastName: string;
  firstName: string;
} {
  const tokens = raw.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);

  if (tokens.length === 0) {
    return { lastName: "", firstName: "" };
  }
  if (tokens.length === 1) {
    return { lastName: tokens[0]!, firstName: "" };
  }

  return {
    lastName: tokens[tokens.length - 1]!,
    firstName: tokens.slice(0, -1).join(" "),
  };
}

export function formatDoctorName(lastName: string, firstName: string): string {
  return [lastName, firstName].filter(Boolean).join(" ");
}
