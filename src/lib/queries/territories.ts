import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { formatDoctorName } from "@/lib/utils/name-normalization";

type Client = SupabaseClient<Database>;

export interface TerritoryRepBreakdown {
  repId: string;
  repName: string;
  count: number;
}

export interface TerritoryAreaDoctor {
  id: string;
  name: string;
  rating: string;
  repName: string;
}

export interface TerritoryAreaMetrics {
  areaId: string;
  canonicalName: string;
  lat: number | null;
  lon: number | null;
  universeCount: number;
  cpoCovered: number;
  repBreakdown: TerritoryRepBreakdown[];
  primaryRepId: string | null;
  primaryRepName: string;
  isMixed: boolean;
  doctors: TerritoryAreaDoctor[];
}

/**
 * Δεδομένα για τον δυναμικό χάρτη territories (/territories) -- ομαδοποίηση
 * ΙΔΙΩΤΩΝ γιατρών (όχι νοσοκομειακών) ανά κανονική περιοχή (areas, migration
 * 0035), με universe/CPO counts και τον "κυρίαρχο" rep της περιοχής.
 *
 * Απαιτεί doctors.area_id συμπληρωμένο -- μέχρι να τρέξει το εγκεκριμένο
 * backfill (βλ. migration 0035 σχόλια), γιατροί χωρίς area_id δεν
 * εμφανίζονται εδώ.
 *
 * Νοσοκομειακοί γιατροί εξαιρούνται πάντα: είτε μέσω institution IS NOT
 * NULL (ο κανόνας που ήδη ισχύει σε όλο το CRM), είτε μέσω brick_code που
 * ξεκινά με "H0" (IQVIA hospital-brick convention).
 */
export async function getTerritoryMapData(
  supabase: Client,
  { repId, nomos }: { repId?: string; nomos?: string } = {},
): Promise<TerritoryAreaMetrics[]> {
  let query = supabase
    .from("doctors")
    .select(
      "id, last_name, first_name, area_id, current_rep_id, rating_cpo, brick_code, institution, areas!inner(canonical_name, lat, lon), profiles!doctors_current_rep_id_fkey(full_name)",
    )
    .eq("status", "active")
    .not("area_id", "is", null);
  if (nomos) query = query.eq("nomos", nomos);
  if (repId) query = query.eq("current_rep_id", repId);

  const { data } = await query;

  type Row = {
    id: string;
    last_name: string;
    first_name: string;
    area_id: string;
    current_rep_id: string | null;
    rating_cpo: string;
    brick_code: string | null;
    institution: string | null;
    areas: { canonical_name: string; lat: number | null; lon: number | null } | null;
    profiles: { full_name: string } | null;
  };

  const byArea = new Map<
    string,
    {
      canonicalName: string;
      lat: number | null;
      lon: number | null;
      universeCount: number;
      cpoCovered: number;
      repCounts: Map<string, { repName: string; count: number }>;
      doctors: TerritoryAreaDoctor[];
    }
  >();

  for (const raw of (data ?? []) as unknown as Row[]) {
    if (raw.institution) continue; // νοσοκομειακός -- ποτέ στον χάρτη territories
    if (raw.brick_code?.toUpperCase().startsWith("H0")) continue; // IQVIA hospital brick
    if (!raw.areas) continue;

    const entry = byArea.get(raw.area_id) ?? {
      canonicalName: raw.areas.canonical_name,
      lat: raw.areas.lat,
      lon: raw.areas.lon,
      universeCount: 0,
      cpoCovered: 0,
      repCounts: new Map<string, { repName: string; count: number }>(),
      doctors: [] as TerritoryAreaDoctor[],
    };
    entry.universeCount++;
    if (raw.rating_cpo !== "0") entry.cpoCovered++;
    const repName = raw.profiles?.full_name ?? "—";
    if (raw.current_rep_id) {
      const rc = entry.repCounts.get(raw.current_rep_id) ?? { repName, count: 0 };
      rc.count++;
      entry.repCounts.set(raw.current_rep_id, rc);
    }
    entry.doctors.push({
      id: raw.id,
      name: formatDoctorName(raw.last_name, raw.first_name),
      rating: raw.rating_cpo,
      repName,
    });
    byArea.set(raw.area_id, entry);
  }

  const RATING_RANK: Record<string, number> = { "3": 4, "2": 3, "1": 2, ΥΔ: 1, "0": 0 };

  return [...byArea.entries()]
    .map(([areaId, entry]) => {
      const repBreakdown = [...entry.repCounts.entries()]
        .map(([id, v]) => ({ repId: id, repName: v.repName, count: v.count }))
        .sort((a, b) => b.count - a.count);
      return {
        areaId,
        canonicalName: entry.canonicalName,
        lat: entry.lat,
        lon: entry.lon,
        universeCount: entry.universeCount,
        cpoCovered: entry.cpoCovered,
        repBreakdown,
        primaryRepId: repBreakdown[0]?.repId ?? null,
        primaryRepName: repBreakdown[0]?.repName ?? "Χωρίς rep",
        isMixed: repBreakdown.length > 1,
        doctors: entry.doctors.sort((a, b) => {
          const rankDiff = (RATING_RANK[b.rating] ?? 0) - (RATING_RANK[a.rating] ?? 0);
          return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name, "el");
        }),
      };
    })
    .sort((a, b) => b.universeCount - a.universeCount);
}
