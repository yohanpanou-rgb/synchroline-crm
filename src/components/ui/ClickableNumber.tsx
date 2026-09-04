"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface ClickableNumberItem {
  id: string;
  label: string;
  sublabel?: string;
  tone?: "success" | "warning" | "danger" | "neutral";
  href?: string;
}

const TONE_DOT: Record<NonNullable<ClickableNumberItem["tone"]>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-ink/20",
};

/**
 * Κάνει έναν αριθμό/ποσοστό clickable — ανοίγει dropdown με τη λίστα πίσω
 * από το νούμερο (π.χ. ονόματα γιατρών). `items` έρχεται ήδη φορτωμένο από
 * τον server (το ίδιο αίτημα που υπολόγισε το νούμερο), οπότε δεν χρειάζεται
 * επιπλέον fetch στο άνοιγμα.
 */
export function ClickableNumber({
  items,
  emptyLabel = "Καμία εγγραφή.",
  children,
  align = "left",
}: {
  items: ClickableNumberItem[];
  emptyLabel?: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded underline decoration-dotted decoration-1 underline-offset-2 hover:decoration-solid"
      >
        {children}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-30 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-black/10 bg-white p-1.5 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-ink/50">{emptyLabel}</p>
          ) : (
            items.map((item) => {
              const row = (
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink/5">
                  {item.tone && (
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[item.tone])} />
                  )}
                  <span className="min-w-0 flex-1 truncate text-ink">{item.label}</span>
                  {item.sublabel && (
                    <span className="shrink-0 text-ink/40">{item.sublabel}</span>
                  )}
                </div>
              );
              return item.href ? (
                <Link key={item.id} href={item.href} className="block">
                  {row}
                </Link>
              ) : (
                <div key={item.id}>{row}</div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
