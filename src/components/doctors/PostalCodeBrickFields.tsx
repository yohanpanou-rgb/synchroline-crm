"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { lookupBrickByPostalCode } from "@/app/(app)/doctors/actions";

/** Ταχυδρομικός κώδικας -> auto-suggest brick (#40). Ο χρήστης μπορεί πάντα
 * να διορθώσει χειροκίνητα το brick μετά την πρόταση. */
export function PostalCodeBrickFields({
  defaultPostalCode,
  defaultBrickCode,
}: {
  defaultPostalCode?: string | null;
  defaultBrickCode?: string | null;
}) {
  const [postalCode, setPostalCode] = useState(defaultPostalCode ?? "");
  const [brickCode, setBrickCode] = useState(defaultBrickCode ?? "");
  const [brickName, setBrickName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePostalChange(value: string) {
    setPostalCode(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 4) return;
    debounceRef.current = setTimeout(async () => {
      setSuggesting(true);
      const result = await lookupBrickByPostalCode(value);
      if (result) {
        setBrickCode(result.brickCode);
        setBrickName(result.brickName ?? "");
      }
      setSuggesting(false);
    }, 400);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Ταχυδρομικός κώδικας
        </label>
        <Input
          name="postal_code"
          value={postalCode}
          onChange={(e) => handlePostalChange(e.target.value)}
          placeholder="π.χ. 15234"
        />
        {suggesting && <p className="mt-1 text-xs text-ink/40">Αναζήτηση brick…</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Κωδικός brick
        </label>
        <Input
          name="brick_code"
          value={brickCode}
          onChange={(e) => setBrickCode(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Όνομα brick
        </label>
        <Input
          name="brick_name"
          value={brickName}
          onChange={(e) => setBrickName(e.target.value)}
          placeholder="προαιρετικό"
        />
      </div>
    </div>
  );
}
