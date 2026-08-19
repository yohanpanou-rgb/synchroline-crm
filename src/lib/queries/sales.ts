import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { toISODate } from "@/lib/constants/schedule";

type Client = SupabaseClient<Database>;

export interface SalesFilters {
  nomoi?: string[];
  subBrand?: string;
  productCode?: string;
  periodStart: string;
  periodEnd: string;
}

export interface SalesTotals {
  value: number;
  units: number;
}

function yearsAgo(dateISO: string, years: number): string {
  const d = new Date(dateISO);
  d.setFullYear(d.getFullYear() - years);
  return toISODate(d);
}

async function fetchRows(
  supabase: Client,
  filters: SalesFilters,
  selectCols: string,
) {
  let query = supabase
    .from("sales_records")
    .select(selectCols)
    .eq("is_sample", false)
    .gte("sale_date", filters.periodStart)
    .lte("sale_date", filters.periodEnd);

  if (filters.nomoi && filters.nomoi.length > 0) {
    query = query.in("nomos", filters.nomoi);
  }
  if (filters.subBrand) {
    query = query.eq("sub_brand", filters.subBrand);
  }
  if (filters.productCode) {
    query = query.or(
      `product_code.ilike.%${filters.productCode}%,product_description.ilike.%${filters.productCode}%`,
    );
  }

  const { data } = await query;
  return data ?? [];
}

async function fetchTotals(supabase: Client, filters: SalesFilters): Promise<SalesTotals> {
  const rows = (await fetchRows(supabase, filters, "quantity, net_value")) as unknown as {
    quantity: number;
    net_value: number;
  }[];
  return rows.reduce(
    (acc, r) => {
      acc.value += Number(r.net_value);
      acc.units += Number(r.quantity);
      return acc;
    },
    { value: 0, units: 0 },
  );
}

export interface SalesSummary {
  current: SalesTotals;
  lastYear: SalesTotals;
  valueYoyPct: number | null;
  unitsYoyPct: number | null;
}

export async function getSalesSummary(
  supabase: Client,
  filters: SalesFilters,
): Promise<SalesSummary> {
  const [current, lastYear] = await Promise.all([
    fetchTotals(supabase, filters),
    fetchTotals(supabase, {
      ...filters,
      periodStart: yearsAgo(filters.periodStart, 1),
      periodEnd: yearsAgo(filters.periodEnd, 1),
    }),
  ]);

  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? ((curr - prev) / prev) * 100 : null;

  return {
    current,
    lastYear,
    valueYoyPct: pctChange(current.value, lastYear.value),
    unitsYoyPct: pctChange(current.units, lastYear.units),
  };
}

export interface SalesGroupRow {
  key: string;
  value: number;
  units: number;
  valueYoyPct: number | null;
}

async function fetchGrouped(
  supabase: Client,
  filters: SalesFilters,
  groupField: "sub_brand" | "product_code" | "nomos",
): Promise<Map<string, SalesTotals>> {
  const rows = (await fetchRows(
    supabase,
    filters,
    `${groupField}, quantity, net_value`,
  )) as unknown as Record<string, string | number>[];
  const map = new Map<string, SalesTotals>();
  for (const row of rows) {
    const key = String(row[groupField] ?? "—");
    const entry = map.get(key) ?? { value: 0, units: 0 };
    entry.value += Number(row.net_value);
    entry.units += Number(row.quantity);
    map.set(key, entry);
  }
  return map;
}

export async function getSalesByGroup(
  supabase: Client,
  filters: SalesFilters,
  groupField: "sub_brand" | "product_code" | "nomos",
): Promise<SalesGroupRow[]> {
  const [current, lastYear] = await Promise.all([
    fetchGrouped(supabase, filters, groupField),
    fetchGrouped(
      supabase,
      {
        ...filters,
        periodStart: yearsAgo(filters.periodStart, 1),
        periodEnd: yearsAgo(filters.periodEnd, 1),
      },
      groupField,
    ),
  ]);

  const rows: SalesGroupRow[] = [];
  for (const [key, totals] of current) {
    const prev = lastYear.get(key);
    const valueYoyPct =
      prev && prev.value > 0 ? ((totals.value - prev.value) / prev.value) * 100 : null;
    rows.push({ key, value: totals.value, units: totals.units, valueYoyPct });
  }
  return rows.sort((a, b) => b.value - a.value);
}

/** Distinct νομοί που έχουν ήδη γραμμές πωλήσεων (για dropdown επιλογής στο admin/manager view). */
export async function getDistinctSalesNomoi(supabase: Client): Promise<string[]> {
  const { data } = await supabase.from("sales_records").select("nomos");
  return [...new Set((data ?? []).map((r) => r.nomos))].sort((a, b) => a.localeCompare(b, "el"));
}

/** Νομοί ανατεθειμένοι σε συγκεκριμένο rep. */
export async function getRepNomoi(supabase: Client, repId: string): Promise<string[]> {
  const { data } = await supabase
    .from("sales_territory_reps")
    .select("nomos")
    .eq("rep_id", repId);
  return (data ?? []).map((r) => r.nomos);
}
