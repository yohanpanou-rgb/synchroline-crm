"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS, type NavItem } from "@/lib/constants/nav";
import {
  DashboardIcon,
  DoctorsIcon,
  VisitsIcon,
  CalendarIcon,
  CyclesIcon,
} from "@/components/ui/icons";

// Icon components can't cross the server -> client boundary as props, so the
// href -> icon mapping lives here (client-side) instead of in nav.ts.
const ICONS_BY_HREF: Record<string, typeof DashboardIcon> = {
  "/dashboard": DashboardIcon,
  "/doctors": DoctorsIcon,
  "/visits": VisitsIcon,
  "/visits/calendar": CalendarIcon,
  "/cycles": CyclesIcon,
};

function isNavItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  // Prefer the longest matching nav href so nested routes that are also
  // their own nav item (e.g. /visits/calendar under /visits) don't
  // highlight both entries at once.
  const longestMatch = NAV_ITEMS.filter(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return longestMatch?.href === href;
}

export function NavLink({
  item,
  variant,
}: {
  item: NavItem;
  variant: "sidebar" | "bottom";
}) {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, item.href);
  const Icon = ICONS_BY_HREF[item.href] ?? DashboardIcon;

  if (variant === "bottom") {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium",
          isActive ? "text-primary" : "text-ink/50",
        )}
      >
        <Icon className="h-6 w-6" strokeWidth={isActive ? 2.2 : 1.8} />
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-white"
          : "text-ink/70 hover:bg-primary/8 hover:text-primary-dark",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
      {item.label}
    </Link>
  );
}
