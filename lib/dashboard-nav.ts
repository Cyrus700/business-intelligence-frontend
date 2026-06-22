export type NavItem = { label: string; href: string; icon: string; badge?: string };

export const DASH_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "grid" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "trend" },
  { label: "Reports", href: "/dashboard/reports", icon: "table" },
  { label: "Alerts", href: "/dashboard/alerts", icon: "bell", badge: "2" },
  { label: "Settings", href: "/dashboard/settings", icon: "gear" },
];
