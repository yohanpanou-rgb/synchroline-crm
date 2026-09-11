"use client";

import dynamic from "next/dynamic";
import type { TerritoryAreaMetrics } from "@/lib/queries/territories";

// Το Leaflet χρειάζεται window/document -- SSR off, φορτώνεται μόνο client-side.
const TerritoryMap = dynamic(
  () => import("@/components/territories/TerritoryMap").then((m) => m.TerritoryMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-ink/40">
        Φόρτωση χάρτη…
      </div>
    ),
  },
);

export function TerritoryMapLoader({
  areas,
  colorMap,
}: {
  areas: TerritoryAreaMetrics[];
  colorMap: Record<string, string>;
}) {
  return <TerritoryMap areas={areas} colorMap={colorMap} />;
}
