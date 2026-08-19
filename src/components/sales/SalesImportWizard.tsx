"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { importSalesChunk, finishSalesImport, type SalesImportRow } from "../../app/(app)/sales/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

const CHUNK_SIZE = 2000;

/** Το αρχείο πηγής χρησιμοποιεί M/D/YY (π.χ. "1/3/24" = 3 Ιανουαρίου 2024), όχι D/M/YY. */
function parseSalesDate(raw: string): string | null {
  const parts = raw.trim().split("/");
  if (parts.length !== 3) return null;
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const yearPart = Number(parts[2]);
  if (!month || !day || !yearPart) return null;
  const year = yearPart < 100 ? 2000 + yearPart : yearPart;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

type Status = "idle" | "parsing" | "ready" | "importing" | "done" | "error";

export function SalesImportWizard() {
  const [rows, setRows] = useState<SalesImportRow[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus("parsing");
    setError(null);
    setRows(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
      const raw = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
      }) as string[][];

      let headerIdx = raw.findIndex((r) => r.includes("Ημερ/νία"));
      if (headerIdx === -1) headerIdx = 0;
      const header = raw[headerIdx]!;
      const dataRows = raw.slice(headerIdx + 1);
      const col = (name: string) => header.indexOf(name);

      const iDate = col("Ημερ/νία");
      const iSubBrand = col("Sub Brand");
      const iNomos = col("Νομός συναλλασομένου");
      const iDeliveryNomos = col("Νομός");
      const iCode = col("Κωδικός CAP είδους");
      const iDesc = col("Περιγραφή είδους");
      const iCustCode = col("Κωδικός Πελάτη");
      const iCustName = col("Επωνυμία Πελάτη");
      const iQty = col("Ποσ.1 πώλησης");
      const iNet = col("NET");

      if ([iDate, iSubBrand, iNomos, iCode, iQty, iNet].some((i) => i === -1)) {
        setError(
          "Δεν βρέθηκαν όλες οι αναμενόμενες στήλες στο αρχείο (Ημερ/νία, Sub Brand, Νομός συναλλασομένου, Κωδικός CAP είδους, Ποσ.1 πώλησης, NET).",
        );
        setStatus("error");
        return;
      }

      const parsed: SalesImportRow[] = [];
      let skippedCount = 0;
      for (const r of dataRows) {
        const dateRaw = r[iDate];
        const isoDate = dateRaw ? parseSalesDate(String(dateRaw)) : null;
        const subBrand = (r[iSubBrand] ?? "").trim();
        const nomos = (r[iNomos] ?? "").trim();
        const code = (r[iCode] ?? "").trim();
        if (!isoDate || !subBrand || !nomos || !code) {
          skippedCount++;
          continue;
        }
        const quantity = parseFloat(r[iQty] ?? "0") || 0;
        const netValue = parseFloat(r[iNet] ?? "0") || 0;
        parsed.push({
          sale_date: isoDate,
          sub_brand: subBrand,
          nomos,
          delivery_nomos: iDeliveryNomos !== -1 ? (r[iDeliveryNomos] ?? "").trim() || null : null,
          product_code: code,
          product_description: (r[iDesc] ?? "").trim() || null,
          customer_code: (r[iCustCode] ?? "").trim() || null,
          customer_name: (r[iCustName] ?? "").trim() || null,
          quantity,
          net_value: netValue,
          is_sample: quantity > 0 && netValue === 0,
        });
      }

      setRows(parsed);
      setSkipped(skippedCount);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Αποτυχία ανάγνωσης αρχείου.");
      setStatus("error");
    }
  }

  async function handleImport() {
    if (!rows) return;
    setStatus("importing");
    setError(null);
    setProgress({ done: 0, total: rows.length });

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const result = await importSalesChunk(chunk, i === 0);
      if (result.error) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setProgress({ done: Math.min(i + CHUNK_SIZE, rows.length), total: rows.length });
    }

    await finishSalesImport();
    setStatus("done");
  }

  const samples = rows?.filter((r) => r.is_sample).length ?? 0;
  const subBrands = rows ? new Set(rows.map((r) => r.sub_brand)).size : 0;
  const nomoi = rows ? new Set(rows.map((r) => r.nomos)).size : 0;
  const dates = rows?.map((r) => r.sale_date).sort() ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Ανέβασμα αρχείου</CardTitle>
        </CardHeader>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="block w-full text-sm"
          disabled={status === "parsing" || status === "importing"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {status === "parsing" && <p className="mt-2 text-sm text-ink/50">Ανάλυση αρχείου…</p>}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      {rows && (status === "ready" || status === "importing" || status === "done") && (
        <Card>
          <CardHeader>
            <CardTitle>2. Προεπισκόπηση</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <p>
              <span className="text-ink/50">Γραμμές:</span> {rows.length}
            </p>
            <p>
              <span className="text-ink/50">Παραλείφθηκαν:</span> {skipped}
            </p>
            <p>
              <span className="text-ink/50">Δείγματα:</span> {samples}
            </p>
            <p>
              <span className="text-ink/50">Sub-brands:</span> {subBrands}
            </p>
            <p>
              <span className="text-ink/50">Νομοί:</span> {nomoi}
            </p>
            <p>
              <span className="text-ink/50">Εύρος:</span>{" "}
              {dates[0]} → {dates[dates.length - 1]}
            </p>
          </div>

          {status === "ready" && (
            <Button className="mt-4" onClick={handleImport}>
              Επιβεβαίωση εισαγωγής ({rows.length} γραμμές)
            </Button>
          )}

          {status === "importing" && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-ink/50">
                <span>Εισαγωγή…</span>
                <span>
                  {progress.done}/{progress.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {status === "done" && (
            <p className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              Η εισαγωγή ολοκληρώθηκε — {rows.length} γραμμές.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
