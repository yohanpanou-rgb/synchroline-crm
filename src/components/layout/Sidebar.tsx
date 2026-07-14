import Image from "next/image";
import { NavLink } from "./NavLink";
import type { NavItem } from "@/lib/constants/nav";

export function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-black/5 bg-white px-4 py-6 md:flex">
      <div className="mb-8 flex flex-col gap-1 px-2">
        <Image
          src="/logo-cpo-greece.webp"
          alt="CPO Greece"
          width={124}
          height={71}
          className="h-9 w-auto"
          priority
        />
        <p className="text-xs font-medium leading-tight text-ink/50">
          Synchroline CRM
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} variant="sidebar" />
        ))}
      </nav>
    </aside>
  );
}
