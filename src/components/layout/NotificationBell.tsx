"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/app/(app)/actions";
import { formatDateGR } from "@/lib/constants/schedule";

interface NotificationItem {
  id: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleClick(n: NotificationItem) {
    if (!n.is_read) await markNotificationRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ειδοποιήσεις"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink/50 hover:bg-black/5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 max-h-96 w-72 overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-black/5 px-3 py-2">
            <span className="text-xs font-semibold text-ink">Ειδοποιήσεις</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead()}
                className="text-xs text-primary hover:underline"
              >
                Όλα ως αναγνωσμένα
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <p className="px-3 py-4 text-xs text-ink/50">Καμία ειδοποίηση.</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`block w-full border-b border-black/5 px-3 py-2.5 text-left text-xs hover:bg-ink/5 ${
                n.is_read ? "text-ink/50" : "text-ink"
              }`}
            >
              <p className="mb-0.5">{n.message}</p>
              <p className="text-[10px] text-ink/40">{formatDateGR(n.created_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
