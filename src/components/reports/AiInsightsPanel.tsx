"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { generateAiInsights } from "@/app/(app)/reports/actions";

export function AiInsightsPanel() {
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateAiInsights();
      if (result.error) {
        setError(result.error);
        setText(null);
      } else {
        setText(result.text ?? "");
      }
    });
  }

  return (
    <div>
      <Button type="button" variant="secondary" size="md" onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Δημιουργία…" : text ? "Ανανέωση AI Σύνοψης" : "Δημιούργησε AI Σύνοψη"}
      </Button>

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {text && (
        <div className="mt-3 whitespace-pre-wrap rounded-xl bg-primary/5 p-3.5 text-sm leading-relaxed text-ink">
          {text}
        </div>
      )}
    </div>
  );
}
