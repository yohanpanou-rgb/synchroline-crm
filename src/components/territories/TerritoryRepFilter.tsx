"use client";

import { useRouter } from "next/navigation";

/** Φίλτρο rep στον χάρτη territories (manager only) -- "Όλοι" ή συγκεκριμένος rep. */
export function TerritoryRepFilter({
  reps,
  selectedRepId,
}: {
  reps: { id: string; full_name: string }[];
  selectedRepId: string; // "" = δικές μου (default) -- "all" = όλοι -- αλλιώς repId
}) {
  const router = useRouter();

  return (
    <select
      value={selectedRepId}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/territories?rep=${value}` : "/territories");
      }}
      className="h-11 shrink-0 rounded-xl border border-black/10 bg-white px-3 text-sm text-ink"
    >
      <option value="">Οι δικές μου</option>
      <option value="all">Όλοι οι reps</option>
      {reps.map((r) => (
        <option key={r.id} value={r.id}>
          {r.full_name}
        </option>
      ))}
    </select>
  );
}
