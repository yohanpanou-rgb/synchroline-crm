"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rescheduleVisit } from "@/app/(app)/visits/actions";
import { cn } from "@/lib/utils/cn";

const DRAG_MIME = "text/x-visit-id";

export function DraggableVisit({
  visitId,
  children,
}: {
  visitId: string;
  children: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, visitId);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn("cursor-grab active:cursor-grabbing", dragging && "opacity-40")}
    >
      {children}
    </div>
  );
}

export function DroppableSlot({
  date,
  time,
  children,
  className,
}: {
  date: string;
  time?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isOver) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const visitId = e.dataTransfer.getData(DRAG_MIME);
        if (!visitId) return;
        setError(null);
        startTransition(async () => {
          const result = await rescheduleVisit(visitId, date, time ?? null);
          if (result?.error) setError(result.error);
          else router.refresh();
        });
      }}
      className={cn(
        className,
        "transition-colors",
        isOver && "bg-primary/10 outline outline-2 outline-primary/40",
        isPending && "opacity-60",
      )}
    >
      {children}
      {error && <p className="px-1 text-[10px] text-danger">{error}</p>}
    </div>
  );
}
