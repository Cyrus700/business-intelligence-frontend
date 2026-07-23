export type NavItem = { label: string; href: string; icon: string; badge?: string; adminOnly?: boolean };

export const DASH_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "grid" },
  { label: "AI Assistant", href: "/dashboard/ai", icon: "spark" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "trend" },
  { label: "Reports", href: "/dashboard/reports", icon: "table" },
  { label: "Alerts", href: "/dashboard/alerts", icon: "bell", badge: "2" },
  { label: "Recommendations", href: "/dashboard/recommendations", icon: "spark" },
  { label: "Data", href: "/dashboard/data", icon: "table" },
  { label: "Users", href: "/dashboard/users", icon: "users", adminOnly: true },
  { label: "Permissions", href: "/dashboard/permissions", icon: "shield", adminOnly: true },
  { label: "Settings", href: "/dashboard/settings", icon: "gear" },
];
