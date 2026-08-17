"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { formatDoctorName } from "@/lib/utils/name-normalization";
import { formatDateGR } from "@/lib/constants/schedule";

interface DoctorSummary {
  doctor: {
    last_name: string;
    first_name: string;
    region: string | null;
    county: string | null;
    specialty: string | null;
    phone_1: string | null;
    weekly_rx_aknicare: number | null;
    weekly_rx_closebax: number | null;
    weekly_rx_terproline: number | null;
    weekly_rx_rosacure: number | null;
  };
  lastVisit: {
    status: string;
    scheduled_date: string | null;
    completed_date: string | null;
  } | null;
}

const PRODUCTS = [
  { key: "weekly_rx_aknicare", label: "Aknicare" },
  { key: "weekly_rx_closebax", label: "Closebax" },
  { key: "weekly_rx_terproline", label: "Terproline" },
  { key: "weekly_rx_rosacure", label: "Rosacure" },
] as const;

export function DoctorHoverCard({
  doctorId,
  href,
  className,
  children,
}: {
  doctorId: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef<DoctorSummary | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
    if (cache.current) {
      setSummary(cache.current);
      return;
    }
    setLoading(true);
    fetch(`/api/doctors/${doctorId}/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DoctorSummary | null) => {
        if (data) {
          cache.current = data;
          setSummary(data);
        }
      })
      .finally(() => setLoading(false));
  }

  function handleLeave() {
    hideTimer.current = setTimeout(() => setVisible(false), 100);
  }

  const products = summary
    ? PRODUCTS.map((p) => ({ ...p, value: summary.doctor[p.key] })).filter(
        (p) => p.value !== null && p.value !== 0,
      )
    : [];

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link href={href} className={className}>
        {children}
      </Link>

      {visible && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-black/5 bg-white p-3 text-left shadow-lg">
          {loading && !summary && (
            <p className="text-xs text-ink/50">Φόρτωση…</p>
          )}
          {summary && (
            <>
              <p className="text-sm font-semibold text-ink">
                {formatDoctorName(summary.doctor.last_name, summary.doctor.first_name)}
              </p>
              <p className="mt-0.5 text-xs text-ink/50">
                {[summary.doctor.specialty, summary.doctor.region, summary.doctor.county]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              {summary.doctor.phone_1 && (
                <p className="mt-0.5 text-xs text-ink/50">{summary.doctor.phone_1}</p>
              )}

              <div className="mt-2 border-t border-black/5 pt-2">
                <p className="text-xs font-medium text-ink/70">Προηγούμενη επίσκεψη</p>
                <p className="text-xs text-ink/50">
                  {summary.lastVisit
                    ? formatDateGR(
                        summary.lastVisit.completed_date ?? summary.lastVisit.scheduled_date!,
                      )
                    : "Καμία ακόμα"}
                </p>
              </div>

              {products.length > 0 && (
                <div className="mt-2 border-t border-black/5 pt-2">
                  <p className="mb-1 text-xs font-medium text-ink/70">
                    Προτιμήσεις προϊόντων (εβδ. συνταγές)
                  </p>
                  <div className="space-y-0.5">
                    {products.map((p) => (
                      <div key={p.key} className="flex justify-between text-xs text-ink/60">
                        <span>{p.label}</span>
                        <span className="tabular-nums">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
