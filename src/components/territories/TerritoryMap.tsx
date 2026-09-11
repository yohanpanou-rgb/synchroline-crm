"use client";

import { useState } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { TerritoryAreaMetrics } from "@/lib/queries/territories";

const ATTICA_CENTER: [number, number] = [37.98, 23.73];

const RATING_TONE: Record<string, string> = {
  "3": "bg-success/15 text-success",
  "2": "bg-primary/15 text-primary-dark",
  "1": "bg-warning/15 text-warning",
  ΥΔ: "bg-ink/10 text-ink/60",
  "0": "bg-danger/10 text-danger",
};

function radiusFor(universeCount: number) {
  // εμβαδόν ~ αναλογικό του universeCount, με λογικά clamped όρια pixels
  return Math.max(8, Math.min(34, Math.round(Math.sqrt(universeCount) * 4.5)));
}

export function TerritoryMap({
  areas,
  colorMap,
}: {
  areas: TerritoryAreaMetrics[];
  colorMap: Record<string, string>;
}) {
  const [selected, setSelected] = useState<TerritoryAreaMetrics | null>(null);
  const plotted = areas.filter((a) => a.lat != null && a.lon != null);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={ATTICA_CENTER}
        zoom={11}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {plotted.map((a) => {
          const color = a.primaryRepId ? colorMap[a.primaryRepId] ?? "#94a3b8" : "#94a3b8";
          const pct = a.universeCount > 0 ? Math.round((100 * a.cpoCovered) / a.universeCount) : 0;
          return (
            <CircleMarker
              key={a.areaId}
              center={[a.lat!, a.lon!]}
              radius={radiusFor(a.universeCount)}
              pathOptions={{
                color,
                weight: a.isMixed ? 3 : 1.5,
                dashArray: a.isMixed ? "4 3" : undefined,
                fillColor: color,
                fillOpacity: 0.5,
              }}
              eventHandlers={{ dblclick: () => setSelected(a) }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="text-xs">
                  <p className="font-semibold">
                    {a.canonicalName} — {a.universeCount} (CPO {a.cpoCovered})
                  </p>
                  <p className="text-ink/60">{pct}% κάλυψη</p>
                  {a.isMixed ? (
                    <p className="mt-1 text-ink/60">
                      Μικτή περιοχή:{" "}
                      {a.repBreakdown.map((r) => `${r.repName} (${r.count})`).join(", ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-ink/60">{a.primaryRepName}</p>
                  )}
                  <p className="mt-1 text-ink/40">Διπλό κλικ για λίστα γιατρών</p>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {selected && (
        <div
          className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/30 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[80%] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <div>
                <p className="font-semibold text-primary-dark">{selected.canonicalName}</p>
                <p className="text-xs text-ink/50">
                  {selected.universeCount} γιατροί · CPO {selected.cpoCovered}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-2 py-1 text-sm text-ink/40 hover:bg-ink/5"
              >
                ✕
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {selected.doctors.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-ink/50">Κανένας γιατρός.</p>
              ) : (
                selected.doctors.map((d) => (
                  <Link
                    key={d.id}
                    href={`/doctors/${d.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-ink/5"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">{d.name}</span>
                    <span className="shrink-0 text-xs text-ink/40">{d.repName}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        RATING_TONE[d.rating] ?? "bg-ink/10 text-ink/60"
                      }`}
                    >
                      {d.rating}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
