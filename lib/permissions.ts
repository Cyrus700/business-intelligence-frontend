// Shipped defaults for the RBAC catalog.
//
// These are no longer the source of truth: an admin edits the live matrix on
// /dashboard/permissions and the server resolves it (see lib/rbac.ts and
// app/core/rbac_defaults.py, which this file mirrors). What lives here is the
// offline fallback — used before /rbac/matrix answers, if it fails, and for
// the built-in roles' presentation metadata.

export type Role = "analyst" | "manager" | "admin";

// Roles aren't limited to the three built-ins — an admin can define custom
// roles at runtime (app/core/rbac_defaults.py / the dynamic RBAC catalog),
// slugged with this same pattern server-side. Route prefixes below accept any
// valid slug, not just the shipped three.
export const ROLE_SLUG_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/;

/** URL for a role's dashboard, or a sub-page under it (e.g. "/analytics"). */
export function dashboardPath(role: string | null | undefined, subpath = ""): string {
  const base = role && ROLE_SLUG_PATTERN.test(role) ? `/${role}/dashboard` : "/dashboard";
  if (!subpath || subpath === "/") return base;
  return `${base}${subpath.startsWith("/") ? subpath : `/${subpath}`}`;
}

export const ROLE_RANK: Record<Role, number> = {
  analyst: 1,
  manager: 2,
  admin: 3,
};

export type Permission = string;

export const PERMISSIONS: Record<Role, Permission[]> = {
  analyst: [
    "dashboard:view",
    "kpis:view",
    "timeseries:view",
    "sales:view",
    "expenses:view",
    "inventory:view",
    "forecasts:view",
    "anomalies:view",
    "trends:view",
    "insights:view",
    "notifications:view",
    "notifications:read",
    "reports:view",
    "reports:download",
    "quality:view",
    "quality:resolve",
    "ml:monitor",
  ],
  manager: [
    "dashboard:view",
    "kpis:view",
    "timeseries:view",
    "sales:view",
    "expenses:view",
    "pnl:view",
    "inventory:view",
    "forecasts:view",
    "anomalies:view",
    "anomalies:update",
    "trends:view",
    "insights:view",
    "insights:pin",
    "alert-rules:manage",
    "notifications:view",
    "notifications:read",
    "reports:view",
    "reports:download",
    "reports:generate",
    "uploads:create",
    "etl:manage",
    "quality:view",
    "quality:run",
    "quality:resolve",
    "ml:monitor",
  ],
  admin: [
    "dashboard:view",
    "kpis:view",
    "timeseries:view",
    "sales:view",
    "expenses:view",
    "pnl:view",
    "inventory:view",
    "forecasts:view",
    "forecasts:retrain",
    "anomalies:view",
    "anomalies:update",
    "trends:view",
    "insights:view",
    "insights:pin",
    "insights:generate",
    "alert-rules:manage",
    "notifications:view",
    "notifications:read",
    "reports:view",
    "reports:download",
    "reports:generate",
    "uploads:create",
    "users:manage",
    "data-sources:manage",
    "etl:manage",
    "quality:view",
    "quality:run",
    "quality:resolve",
    "audit-logs:view",
    "ml:monitor",
    "health:system",
    "ai:usage",
  ],
};

export interface PermissionGroup {
  label: string;
  permissions: {
    key: Permission;
    label: string;
    description: string;
  }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Dashboards & KPIs",
    permissions: [
      { key: "dashboard:view", label: "View dashboard", description: "Access the main overview dashboard" },
      { key: "kpis:view", label: "View KPIs", description: "See KPI cards and summary metrics" },
      { key: "timeseries:view", label: "View timeseries", description: "View trend charts over time" },
    ],
  },
  {
    label: "Sales & Finance",
    permissions: [
      { key: "sales:view", label: "View sales data", description: "See sales transactions, product and channel breakdowns" },
      { key: "expenses:view", label: "View expenses", description: "See expense breakdowns by category" },
      { key: "pnl:view", label: "View P&L", description: "See profit & loss statements" },
      { key: "inventory:view", label: "View inventory", description: "See inventory levels and low-stock alerts" },
    ],
  },
  {
    label: "ML & Analytics",
    permissions: [
      { key: "forecasts:view", label: "View forecasts", description: "See revenue and demand forecasts" },
      { key: "forecasts:retrain", label: "Retrain models", description: "Trigger ML model retraining" },
      { key: "anomalies:view", label: "View anomalies", description: "See detected anomaly alerts" },
      { key: "anomalies:update", label: "Dismiss anomalies", description: "Acknowledge or dismiss anomaly alerts" },
      { key: "trends:view", label: "View trends", description: "See trend analysis" },
      { key: "ml:monitor", label: "View ML monitoring", description: "See model registry, backtest and drift status" },
    ],
  },
  {
    label: "Insights & Reports",
    permissions: [
      { key: "insights:view", label: "View insights", description: "See AI-generated business insights" },
      { key: "insights:pin", label: "Pin insights", description: "Mark insights as important" },
      { key: "insights:generate", label: "Generate insights", description: "Trigger AI insight generation" },
      { key: "reports:view", label: "View reports", description: "See generated reports" },
      { key: "reports:download", label: "Download reports", description: "Download reports as files" },
      { key: "reports:generate", label: "Generate reports", description: "Create and schedule reports" },
    ],
  },
  {
    label: "Operations",
    permissions: [
      { key: "alert-rules:manage", label: "Manage alert rules", description: "Create, edit and delete alert rules" },
      { key: "notifications:view", label: "View notifications", description: "See system notifications" },
      { key: "notifications:read", label: "Read notifications", description: "Mark notifications as read" },
    ],
  },
  {
    label: "Data Integration",
    permissions: [
      { key: "uploads:create", label: "Upload data", description: "Upload CSV and Excel data files" },
      { key: "etl:manage", label: "Manage ETL", description: "Run and monitor ETL pipelines" },
      { key: "data-sources:manage", label: "Manage data sources", description: "Add and configure data sources" },
      { key: "quality:view", label: "View data quality", description: "See data quality score, history and issues" },
      { key: "quality:run", label: "Run quality audits", description: "Trigger a manual data-quality audit run" },
      { key: "quality:resolve", label: "Resolve quality issues", description: "Acknowledge or resolve data-quality issues" },
    ],
  },
  {
    label: "Administration",
    permissions: [
      { key: "users:manage", label: "Manage users", description: "Create, edit and deactivate users" },
      { key: "audit-logs:view", label: "View audit logs", description: "See system audit trail" },
      { key: "health:system", label: "View system health", description: "See API, DB, storage, ETL and AI component health" },
      { key: "ai:usage", label: "View AI usage", description: "See AI provider calls, latency, failures and cost" },
    ],
  },
];

export const ROLE_DESCRIPTIONS: Record<Role, { title: string; summary: string; color: string }> = {
  analyst: {
    title: "Analyst",
    summary: "View data, dashboards, forecasts and insights. Read-only access to most features.",
    color: "bg-green-100 text-green-700",
  },
  manager: {
    title: "Manager",
    summary: "Everything an analyst can do, plus upload data, run ETL, manage anomalies, alert rules, reports and view P&L.",
    color: "bg-blue-100 text-blue-700",
  },
  admin: {
    title: "Admin",
    summary: "Full platform control — manage users, data sources, audit logs and ML models.",
    color: "bg-purple-100 text-purple-700",
  },
};

export type RoleInfo = { title: string; summary: string; color: string };

/** Presentation metadata for a role, tolerant of admin-defined custom roles. */
export function getRoleInfo(role: string | null): RoleInfo | null {
  if (!role) return null;
  return (
    ROLE_DESCRIPTIONS[role as Role] ?? {
      title: role.charAt(0).toUpperCase() + role.slice(1).replace(/[-_]/g, " "),
      summary: "Custom role — see Roles & Permissions for its exact access.",
      color: "bg-slate-100 text-slate-700",
    }
  );
}

export function getPermissionsForRole(role: Role | null): Permission[] {
  if (!role) return [];
  return PERMISSIONS[role] ?? PERMISSIONS.analyst;
}

export function roleCan(role: Role | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[role] ?? []).includes(permission);
}
