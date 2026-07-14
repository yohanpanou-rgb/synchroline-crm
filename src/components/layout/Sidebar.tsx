import Image from "next/image";
import { NavLink } from "./NavLink";
import type { NavItem } from "@/lib/constants/nav";

export function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-black/5 bg-white px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <Image src="/logo-cpo-greece.svg" alt="" width={36} height={36} />
        <div>
          <p className="text-sm font-semibold leading-tight text-primary-dark">
            Synchroline
          </p>
          <p className="text-xs leading-tight text-ink/50">CPO Greece</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} variant="sidebar" />
        ))}
      </nav>
    </aside>
  );
}
