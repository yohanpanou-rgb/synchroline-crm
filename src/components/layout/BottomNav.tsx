import { NavLink } from "./NavLink";
import type { NavItem } from "@/lib/constants/nav";

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map((item) => (
        <NavLink key={item.href} item={item} variant="bottom" />
      ))}
    </nav>
  );
}
