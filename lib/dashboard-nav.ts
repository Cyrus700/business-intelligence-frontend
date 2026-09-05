import type { Permission } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  /** Requires exactly this permission (from the live RBAC matrix). */
  permission?: Permission;
  /** Requires this built-in role floor in addition to `permission`. */
  minRole?: "analyst" | "manager" | "admin";
  /** Only visible to System Admin (is_super_admin). */
  superAdminOnly?: boolean;
};

export const DASH_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "grid", permission: "dashboard:view" },
  { label: "Executive", href: "/dashboard/executive", icon: "chart", permission: "dashboard:view" },
  { label: "Explore", href: "/dashboard/explore", icon: "search", permission: "sales:view" },
  { label: "AI Assistant", href: "/dashboard/ai", icon: "spark", permission: "insights:view" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "trend", permission: "timeseries:view" },
  { label: "Compare", href: "/dashboard/compare", icon: "columns", permission: "compare:view" },
  { label: "What-If", href: "/dashboard/what-if", icon: "activity", permission: "timeseries:view" },
  { label: "Reports", href: "/dashboard/reports", icon: "table", permission: "reports:view" },
  { label: "Alerts", href: "/dashboard/alerts", icon: "bell", badge: "2", permission: "anomalies:view" },
  { label: "Recommendations", href: "/dashboard/recommendations", icon: "spark", permission: "insights:view" },
  { label: "ML Monitoring", href: "/dashboard/ml-monitoring", icon: "cpu", permission: "ml:monitor" },
  { label: "System Health", href: "/dashboard/system-health", icon: "activity", permission: "health:system", minRole: "admin" },
  { label: "Admin Center", href: "/dashboard/admin", icon: "cpu", permission: "users:manage", minRole: "admin" },
  { label: "Businesses", href: "/dashboard/businesses", icon: "building", permission: "users:manage", minRole: "admin", superAdminOnly: true },
  { label: "Data", href: "/dashboard/data", icon: "table", permission: "uploads:create" },
  {
    label: "Data Quality",
    href: "/dashboard/data-quality",
    icon: "shield",
    permission: "quality:view",
  },
  { label: "Users", href: "/dashboard/users", icon: "users", permission: "users:manage", minRole: "admin" },
  { label: "Permissions", href: "/dashboard/permissions", icon: "shield", permission: "users:manage", minRole: "admin" },
  { label: "Settings", href: "/dashboard/settings", icon: "gear", permission: "dashboard:view" },
];
