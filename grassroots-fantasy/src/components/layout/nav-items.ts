import { Home, Shirt, BarChart3, Trophy, CalendarDays, HelpCircle, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  mobile?: boolean;
}

// FPL-style tab order. Every href is an existing route.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Status", short: "Home", icon: Home, mobile: true },
  { href: "/squad", label: "Pick Team", short: "My Team", icon: Shirt, mobile: true },
  { href: "/players", label: "Players", short: "Players", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", short: "Table", icon: Trophy, mobile: true },
  { href: "/fixtures", label: "Fixtures", short: "Fixtures", icon: CalendarDays, mobile: true },
  { href: "/how-it-works", label: "Help", short: "Help", icon: HelpCircle },
];

export function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/profile"));
  return pathname === href || pathname.startsWith(`${href}/`);
}
