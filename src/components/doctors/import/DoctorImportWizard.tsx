"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { importDoctorsChunk, type DoctorImportRow } from "../../../app/(app)/doctors/import/actions";
import { DOCTOR_IMPORT_FIELDS } from "@/lib/constants/doctor-import-fields";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

const CHUNK_SIZE = 300;
const IGNORE = "__ignore__";
const NO_REP = "__no_rep__";

type Step = "upload" | "map" | "confirming" | "done";

interface Rep {
  id: string;
  full_name: string;
}

export function DoctorImportWizard({ reps }: { reps: Rep[] }) {
  const [step, setStep] = useState<Step>("upload");
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});
  const [repValueMap, setRepValueMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ updated: number; created: number; createdNames: string[] } | null>(
    null,
  );

  async function handleFile(file: File) {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
      const raw = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
      }) as string[][];

      if (raw.length < 2) {
        setError("Το αρχείο δεν έχει δεδομένα.");
        return;
      }

      setHeader(raw[0]!);
      setRows(raw.slice(1).filter((r) => r.some((c) => c?.trim())));
      setColumnMap({});
      setStep("map");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Αποτυχία ανάγνωσης αρχείου.");
    }
  }

  const repColumnIdx = Object.entries(columnMap).find(([, target]) => target === "rep")?.[0];
  const repRawValues = repColumnIdx
    ? [...new Set(rows.map((r) => (r[Number(repColumnIdx)] ?? "").trim()).filter(Boolean))]
    : [];

  const fullNameColumnIdx = Object.entries(columnMap).find(([, target]) => target === "full_name")?.[0];
  const canProceed = fullNameColumnIdx !== undefined;

  function buildImportRows(): DoctorImportRow[] {
    const mappings = Object.entries(columnMap).filter(([, target]) => target && target !== IGNORE);
    return rows
      .map((r) => {
        const fields: Record<string, string> = {};
        let fullName = "";
        for (const [idxStr, target] of mappings) {
          const idx = Number(idxStr);
          const rawValue = (r[idx] ?? "").trim();
          if (!rawValue) continue;

          if (target === "full_name") {
            fullName = rawValue;
            continue;
          }
          if (target === "rep") {
            const repId = repValueMap[rawValue];
            if (repId && repId !== NO_REP) fields.current_rep_id = repId;
            continue;
          }
          const fieldDef = DOCTOR_IMPORT_FIELDS.find((f) => f.key === target);
          if (fieldDef?.enumValues && !fieldDef.enumValues.includes(rawValue)) continue;
          fields[target] = rawValue;
        }
        return { fullName, fields };
      })
      .filter((r) => r.fullName);
  }

  async function handleConfirm() {
    const importRows = buildImportRows();
    setStep("confirming");
    setProgress({ done: 0, total: importRows.length });
    const totals = { updated: 0, created: 0, createdNames: [] as string[] };

    for (let i = 0; i < importRows.length; i += CHUNK_SIZE) {
      const chunk = importRows.slice(i, i + CHUNK_SIZE);
      const res = await importDoctorsChunk(chunk);
      if (res.error) {
        setError(res.error);
        setStep("map");
        return;
      }
      totals.updated += res.updated ?? 0;
      totals.created += res.created ?? 0;
      totals.createdNames.push(...(res.createdNames ?? []));
      setProgress({ done: Math.min(i + CHUNK_SIZE, importRows.length), total: importRows.length });
    }

    setResult(totals);
    setStep("done");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Ανέβασμα αρχείου</CardTitle>
        </CardHeader>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="block w-full text-sm"
          disabled={step === "confirming"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      {header.length > 0 && (step === "map" || step === "confirming" || step === "done") && (
        <Card>
          <CardHeader>
            <CardTitle>2. Αντιστοίχιση στηλών ({rows.length} γραμμές)</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {header.map((h, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-ink" title={h}>
                  {h || `(στήλη ${idx + 1})`}
                </span>
                <Select
                  value={columnMap[idx] ?? IGNORE}
                  disabled={step !== "map"}
                  onChange={(e) =>
                    setColumnMap((prev) => ({ ...prev, [idx]: e.target.value }))
                  }
                >
                  <option value={IGNORE}>— αγνόησε —</option>
                  {DOCTOR_IMPORT_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}

      {repRawValues.length > 0 && (step === "map" || step === "confirming" || step === "done") && (
        <Card>
          <CardHeader>
            <CardTitle>3. Αντιστοίχιση reps</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {repRawValues.map((value) => (
              <div key={value} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-ink" title={value}>
                  {value}
                </span>
                <Select
                  value={repValueMap[value] ?? NO_REP}
                  disabled={step !== "map"}
                  onChange={(e) =>
                    setRepValueMap((prev) => ({ ...prev, [value]: e.target.value }))
                  }
                >
                  <option value={NO_REP}>— χωρίς ανάθεση —</option>
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === "map" && (
        <Button onClick={handleConfirm} disabled={!canProceed}>
          Επιβεβαίωση εισαγωγής ({rows.length} γραμμές)
        </Button>
      )}
      {!canProceed && step === "map" && (
        <p className="text-xs text-ink/50">
          Πρέπει να αντιστοιχίσεις τουλάχιστον μία στήλη στο «Ονοματεπώνυμο».
        </p>
      )}

      {step === "confirming" && (
        <Card>
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
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle>Ολοκληρώθηκε</CardTitle>
          </CardHeader>
          <p className="text-sm text-ink">
            Ενημερώθηκαν: {result.updated} · Δημιουργήθηκαν: {result.created}
          </p>
          {result.createdNames.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-ink/50">
                Νέοι γιατροί (έλεγξέ τους στο Πελατολόγιο):
              </p>
              <ul className="max-h-48 space-y-0.5 overflow-y-auto text-xs text-ink/70">
                {result.createdNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
