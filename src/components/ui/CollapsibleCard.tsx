"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export function CollapsibleCard({
  title,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className={cn("p-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-primary-dark">{title}</span>
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4 shrink-0 text-ink/40 transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="border-t border-black/5 p-4">{children}</div>}
    </Card>
  );
}
