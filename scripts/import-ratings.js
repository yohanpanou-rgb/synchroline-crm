/**
 * One-off import: crm_rating_cpo_import.csv -> doctors.rating_cpo
 *
 * Columns: full_name, city, brick, assigned_rep, rating_cpo
 *
 * Matching existing doctors: normalized name (last-token = surname, same
 * heuristic as src/lib/utils/name-normalization.ts) compared against
 * doctors.last_name/first_name, uppercased/trimmed. Match -> update ONLY
 * rating_cpo (per spec, nothing else is touched on existing doctors).
 * No match -> create a new doctor with the available CSV fields + rating_cpo,
 * NO financial fields (budget/incentive/disbursed are explicitly out of
 * scope for this task).
 *
 * assigned_rep is matched against active profiles (role rep/manager) by
 * first-name substring, resolved dynamically from the DB rather than a
 * hardcoded name->email table (which would go stale). Values that don't
 * match any rep (blank, "ΣΥΓΓΡΟΣ", or anything unrecognized) are left
 * unassigned and reported.
 *
 * Usage:
 *   node scripts/import-ratings.js <path-to-csv>              (dry run)
 *   node scripts/import-ratings.js <path-to-csv> --apply       (writes)
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (service role key is only ever read from the environment, never written
 * to a file).
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const RATING_VALUES = new Set(["0", "1", "2", "3", "ΥΔ"]);

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeDoctorName(raw) {
  const tokens = raw.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (tokens.length === 0) return { lastName: "", firstName: "" };
  if (tokens.length === 1) return { lastName: tokens[0], firstName: "" };
  return {
    lastName: tokens[tokens.length - 1],
    firstName: tokens.slice(0, -1).join(" "),
  };
}

function nameKey(lastName, firstName) {
  return `${(lastName || "").trim().toUpperCase()}|${(firstName || "")
    .trim()
    .toUpperCase()}`;
}

async function fetchAllDoctors(supabase) {
  const all = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("doctors")
      .select("id, last_name, first_name")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}

async function main() {
  const csvPath = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!csvPath) {
    console.error("Usage: node scripts/import-ratings.js <path-to-csv> [--apply]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const text = fs.readFileSync(path.resolve(csvPath), "utf8");
  const rows = parseCSV(text).filter((r) => r.length > 1 || r[0] !== "");
  const header = rows[0];
  const data = rows.slice(1);
  const col = (name) => header.indexOf(name);

  const iFullName = col("full_name");
  const iCity = col("city");
  const iBrick = col("brick");
  const iRep = col("assigned_rep");
  const iRating = col("rating_cpo");

  console.log(`CSV: ${data.length} data rows`);

  // Dedupe within file by normalized name (keep last occurrence).
  const byKey = new Map();
  let inFileDupes = 0;
  for (const r of data) {
    const fullName = (r[iFullName] ?? "").trim();
    if (!fullName) continue;
    const { lastName, firstName } = normalizeDoctorName(fullName);
    const key = nameKey(lastName, firstName);
    if (byKey.has(key)) inFileDupes++;
    byKey.set(key, {
      fullName,
      lastName,
      firstName,
      city: (r[iCity] ?? "").trim() || null,
      brick: (r[iBrick] ?? "").trim() || null,
      repRaw: (r[iRep] ?? "").trim(),
      rating: (r[iRating] ?? "").trim(),
    });
  }
  console.log(`Unique names after in-file dedupe: ${byKey.size} (${inFileDupes} duplicates collapsed)`);

  const invalidRatings = [...byKey.values()].filter((v) => !RATING_VALUES.has(v.rating));
  if (invalidRatings.length > 0) {
    console.error(
      `${invalidRatings.length} rows have an invalid rating_cpo value, aborting:`,
      invalidRatings.slice(0, 10).map((v) => `${v.fullName} -> "${v.rating}"`),
    );
    process.exit(1);
  }

  // Resolve reps dynamically from the DB (no hardcoded name->email table).
  const { data: reps, error: repsError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["rep", "manager"])
    .eq("is_active", true);
  if (repsError) throw repsError;

  // profiles.full_name is the rep's email (not a Greek display name), so a
  // substring match against assigned_rep never works. Confirmed with the
  // user which email belongs to which CSV first name.
  const REP_EMAIL_PREFIX_BY_NAME = {
    ΣΑΒΒΑΣ: "s.feloukidis",
    ΕΙΡΗΝΗ: "i.gavrielidou",
    ΕΛΕΟΝΩΡΑ: "e.konstantinidi",
    ΑΝΤΩΝΗΣ: "a.kafes",
  };

  const unmatchedRepValues = new Map();
  function resolveRep(repRaw) {
    const prefix = REP_EMAIL_PREFIX_BY_NAME[repRaw?.toUpperCase()];
    const match = prefix
      ? reps.find((r) => r.full_name.toLowerCase().startsWith(prefix))
      : null;
    if (!match) {
      const label = repRaw || "(κενό)";
      unmatchedRepValues.set(label, (unmatchedRepValues.get(label) ?? 0) + 1);
      return null;
    }
    return match;
  }

  const existingDoctors = await fetchAllDoctors(supabase);
  const existingByKey = new Map(
    existingDoctors.map((d) => [nameKey(d.last_name, d.first_name), d]),
  );
  console.log(`Existing doctors in DB: ${existingDoctors.length}`);

  const toUpdate = [];
  const toCreate = [];

  for (const [key, row] of byKey) {
    const existing = existingByKey.get(key);
    if (existing) {
      toUpdate.push({ id: existing.id, rating_cpo: row.rating, fullName: row.fullName });
    } else {
      const rep = resolveRep(row.repRaw);
      toCreate.push({ row, rep });
    }
  }

  console.log(`\nWill UPDATE rating_cpo on ${toUpdate.length} existing doctors.`);
  console.log(`Will CREATE ${toCreate.length} new doctors.`);
  if (unmatchedRepValues.size > 0) {
    console.log("\nUnmatched assigned_rep values (new doctors left unassigned):");
    for (const [v, count] of unmatchedRepValues) console.log(`  "${v}": ${count}`);
  }

  if (!apply) {
    console.log("\nDry run only — no writes made. Re-run with --apply to commit.");
    console.log("\nSample of new doctors that would be created:");
    for (const { row } of toCreate.slice(0, 20)) {
      console.log(`  ${row.fullName} (city=${row.city}, brick=${row.brick}, rating=${row.rating})`);
    }
    return;
  }

  // Batched updates (existing doctors) — one request per row, rating_cpo only.
  let updatedCount = 0;
  for (const u of toUpdate) {
    const { error } = await supabase
      .from("doctors")
      .update({ rating_cpo: u.rating_cpo })
      .eq("id", u.id);
    if (error) {
      console.error(`Update failed for ${u.fullName} (${u.id}):`, error.message);
      continue;
    }
    updatedCount++;
  }

  // Bricks referenced by new doctors need to exist first (FK).
  const brickCodes = [...new Set(toCreate.map((c) => c.row.brick).filter(Boolean))];
  for (const code of brickCodes) {
    await supabase.from("bricks").upsert({ code });
  }

  const createdNames = [];
  let createdCount = 0;
  for (const { row, rep } of toCreate) {
    const { data: created, error } = await supabase
      .from("doctors")
      .insert({
        full_name_raw: row.fullName,
        last_name: row.lastName,
        first_name: row.firstName,
        county: row.city,
        brick_code: row.brick,
        current_rep_id: rep ? rep.id : null,
        status: "active",
        rating_cpo: row.rating,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error(`Insert failed for ${row.fullName}:`, error?.message);
      continue;
    }
    createdCount++;
    createdNames.push(row.fullName);
    if (rep) {
      await supabase.from("territory_assignments").insert({
        doctor_id: created.id,
        rep_id: rep.id,
        valid_from: new Date().toISOString().slice(0, 10),
      });
    }
  }

  console.log(`\nDone. Updated: ${updatedCount}. Created: ${createdCount}.`);
  console.log("\nNewly created doctors (review manually):");
  for (const name of createdNames) console.log(`  - ${name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
