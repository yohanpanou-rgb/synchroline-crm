import type { UserRole } from "@/lib/types/database.types";
import {
  DashboardIcon,
  DoctorsIcon,
  VisitsIcon,
  CyclesIcon,
} from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof DashboardIcon;
  roles?: UserRole[]; // undefined = visible to all roles
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/doctors", label: "Πελατολόγιο", icon: DoctorsIcon },
  { href: "/visits", label: "Επισκέψεις", icon: VisitsIcon },
  {
    href: "/cycles",
    label: "Κύκλοι",
    icon: CyclesIcon,
    roles: ["admin", "manager"],
  },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
