import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isManagerOrAdmin } from "@/lib/supabase/profile";
import {
  getSalesSummary,
  getSalesByGroup,
  getDistinctSalesNomoi,
  getRepNomoi,
} from "@/lib/queries/sales";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toISODate } from "@/lib/constants/schedule";
import { cn } from "@/lib/utils/cn";

type Period = "ytd" | "mtd";

function periodRange(period: Period): { start: string; end: string } {
  const today = new Date();
  const start =
    period === "mtd"
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(today.getFullYear(), 0, 1);
  return { start: toISODate(start), end: toISODate(today) };
}

function fmtEuro(v: number): string {
  return v.toLocaleString("el-GR", { maximumFractionDigits: 0 }) + " €";
}

function fmtUnits(v: number): string {
  return v.toLocaleString("el-GR", { maximumFractionDigits: 0 });
}

function YoyBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-ink/40">—</span>;
  const tone = pct >= 0 ? "success" : "danger";
  return (
    <Badge tone={tone}>
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(0)}% YoY
    </Badge>
  );
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    nomos?: string;
    subBrand?: string;
    q?: string;
    period?: string;
  }>;
}) {
  const profile = await requireProfile();
  const manager = isManagerOrAdmin(profile.role);
  const supabase = await createClient();
  const { nomos, subBrand, q, period: periodParam } = await searchParams;
  const period: Period = periodParam === "mtd" ? "mtd" : "ytd";
  const { start, end } = periodRange(period);

  const scopeNomoi = manager ? await getDistinctSalesNomoi(supabase) : await getRepNomoi(supabase, profile.id);
  const activeNomoi = nomos ? [nomos] : manager ? undefined : scopeNomoi;

  const filters = {
    nomoi: activeNomoi,
    subBrand: subBrand || undefined,
    productCode: q || undefined,
    periodStart: start,
    periodEnd: end,
  };

  const [summary, bySubBrand, byProductCode, byNomos] = await Promise.all([
    getSalesSummary(supabase, filters),
    getSalesByGroup(supabase, filters, "sub_brand"),
    getSalesByGroup(supabase, filters, "product_code"),
    manager ? getSalesByGroup(supabase, filters, "nomos") : Promise.resolve([]),
  ]);

  function href(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { nomos, subBrand, q, period, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/sales?${qs}` : "/sales";
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-primary-dark">Πωλήσεις</h1>
        {profile.role === "admin" && (
          <div className="flex gap-2">
            <Link href="/sales/territories">
              <Button variant="secondary" size="md">Ανάθεση νομών</Button>
            </Link>
            <Link href="/sales/import">
              <Button size="md">Εισαγωγή αρχείου</Button>
            </Link>
          </div>
        )}
      </div>
      <p className="mb-6 text-sm text-ink/50">
        Αξίες σε € και τεμάχια, χωρίς δείγματα. {start} → {end}
      </p>

      {scopeNomoi.length === 0 && !manager && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          Δεν σου έχει ανατεθεί κανένας νομός ακόμα — ζήτησε από τον admin να
          σε προσθέσει στη ρύθμιση «Ανάθεση νομών σε reps».
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          href={href({ period: "ytd" })}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            period === "ytd" ? "bg-primary-dark text-white" : "bg-ink/5 text-ink/60 hover:bg-ink/10",
          )}
        >
          YTD
        </Link>
        <Link
          href={href({ period: "mtd" })}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            period === "mtd" ? "bg-primary-dark text-white" : "bg-ink/5 text-ink/60 hover:bg-ink/10",
          )}
        >
          MTD
        </Link>

        {(manager ? scopeNomoi : scopeNomoi).length > 1 && (
          <form action="/sales" className="ml-auto flex items-center gap-2">
            <input type="hidden" name="period" value={period} />
            {subBrand && <input type="hidden" name="subBrand" value={subBrand} />}
            {q && <input type="hidden" name="q" value={q} />}
            <select
              name="nomos"
              defaultValue={nomos ?? ""}
              className="h-9 rounded-lg border border-black/10 bg-white px-2 text-xs"
            >
              <option value="">Όλοι οι νομοί</option>
              {scopeNomoi.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" size="md" className="h-9 px-3 text-xs">
              Εφαρμογή
            </Button>
          </form>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-medium text-ink/50">Αξία (NET)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-primary-dark">
            {fmtEuro(summary.current.value)}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-xs text-ink/50">
            <span>πέρυσι {fmtEuro(summary.lastYear.value)}</span>
            <YoyBadge pct={summary.valueYoyPct} />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-medium text-ink/50">Τεμάχια</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-primary-dark">
            {fmtUnits(summary.current.units)}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-xs text-ink/50">
            <span>πέρυσι {fmtUnits(summary.lastYear.units)}</span>
            <YoyBadge pct={summary.unitsYoyPct} />
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ανά Sub Brand</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                <th className="py-2 pr-3 font-medium">
                  <Link href={href({ subBrand: undefined })} className="hover:text-primary">
                    Sub Brand
                  </Link>
                </th>
                <th className="py-2 pr-3 font-medium">Αξία</th>
                <th className="py-2 pr-3 font-medium">Τεμάχια</th>
                <th className="py-2 pr-3 font-medium">YoY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {bySubBrand.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-sm text-ink/50">
                    Δεν υπάρχουν δεδομένα.
                  </td>
                </tr>
              )}
              {bySubBrand.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-3">
                    <Link
                      href={href({ subBrand: row.key === subBrand ? undefined : row.key })}
                      className={cn(
                        "font-medium",
                        row.key === subBrand ? "text-primary" : "text-ink hover:text-primary",
                      )}
                    >
                      {row.key}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{fmtEuro(row.value)}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtUnits(row.units)}</td>
                  <td className="py-2 pr-3">
                    <YoyBadge pct={row.valueYoyPct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {manager && byNomos.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ανά Νομό</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                  <th className="py-2 pr-3 font-medium">Νομός</th>
                  <th className="py-2 pr-3 font-medium">Αξία</th>
                  <th className="py-2 pr-3 font-medium">Τεμάχια</th>
                  <th className="py-2 pr-3 font-medium">YoY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {byNomos.slice(0, 20).map((row) => (
                  <tr key={row.key}>
                    <td className="py-2 pr-3 font-medium text-ink">{row.key}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtEuro(row.value)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtUnits(row.units)}</td>
                    <td className="py-2 pr-3">
                      <YoyBadge pct={row.valueYoyPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ανά Κωδικό</CardTitle>
        </CardHeader>
        <form action="/sales" className="mb-3 flex gap-2">
          <input type="hidden" name="period" value={period} />
          {nomos && <input type="hidden" name="nomos" value={nomos} />}
          {subBrand && <input type="hidden" name="subBrand" value={subBrand} />}
          <Input name="q" defaultValue={q ?? ""} placeholder="Αναζήτηση κωδικού ή περιγραφής…" />
          <Button type="submit" variant="secondary" size="md">
            Αναζήτηση
          </Button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-ink/50">
                <th className="py-2 pr-3 font-medium">Περιγραφή</th>
                <th className="py-2 pr-3 font-medium">Αξία</th>
                <th className="py-2 pr-3 font-medium">Τεμάχια</th>
                <th className="py-2 pr-3 font-medium">YoY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {byProductCode.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-sm text-ink/50">
                    Δεν υπάρχουν δεδομένα.
                  </td>
                </tr>
              )}
              {byProductCode.slice(0, 30).map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-3 font-medium text-ink" title={row.key}>
                    {row.label}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{fmtEuro(row.value)}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtUnits(row.units)}</td>
                  <td className="py-2 pr-3">
                    <YoyBadge pct={row.valueYoyPct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {byProductCode.length > 30 && (
            <p className="mt-2 text-xs text-ink/40">
              Εμφανίζονται τα 30 πρώτα από {byProductCode.length} κωδικούς — χρησιμοποίησε την αναζήτηση για τα υπόλοιπα.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
