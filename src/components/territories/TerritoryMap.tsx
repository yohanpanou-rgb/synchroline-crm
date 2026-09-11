"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { TerritoryAreaMetrics } from "@/lib/queries/territories";

const ATTICA_CENTER: [number, number] = [37.98, 23.73];

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
  const plotted = areas.filter((a) => a.lat != null && a.lon != null);

  return (
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
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
