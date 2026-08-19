import type { UserRole } from "@/lib/types/database.types";

export interface NavItem {
  href: string;
  label: string;
  roles?: UserRole[]; // undefined = visible to all roles
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/doctors", label: "Πελατολόγιο" },
  { href: "/visits", label: "Επισκέψεις" },
  { href: "/visits/calendar", label: "Ημερολόγιο" },
  { href: "/pharmacies", label: "Φαρμακεία" },
  { href: "/hospitals", label: "Νοσοκομεία" },
  { href: "/sales", label: "Πωλήσεις" },
  { href: "/cycles", label: "Κύκλοι", roles: ["admin", "manager"] },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
