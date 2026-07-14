"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "@/lib/constants/nav";

export function NavLink({
  item,
  variant,
}: {
  item: NavItem;
  variant: "sidebar" | "bottom";
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

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
