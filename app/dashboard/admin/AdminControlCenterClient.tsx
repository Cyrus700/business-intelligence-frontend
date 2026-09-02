"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet, queryKeys, type SystemHealthOut, type AiUsageOut } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import PendingApprovals from "@/components/dashboard/PendingApprovals";
import { useAuth } from "@/lib/auth-context";

type AdminSection = {
  id: string;
  label: string;
  icon: string;
  description: string;
  href: string;
  badge?: string;
  status?: "ok" | "warning" | "error";
  metric?: string;
};

const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: "users",
    label: "Users & Roles",
    icon: "users",
    description: "Manage users, roles, and permissions",
    href: "/dashboard/users",
    metric: "3 roles, 50+ permissions",
  },
  {
    id: "permissions",
    label: "Permissions Matrix",
    icon: "shield",
    description: "Edit role×permission matrix, audit trail",
    href: "/dashboard/permissions",
    metric: "Live matrix editor",
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: "activity",
    description: "System audit trail with correlation IDs",
    href: "/dashboard/audit",
    metric: "Request-ID correlated",
  },
  {
    id: "data-sources",
    label: "Data Sources",
    icon: "pipe",
    description: "Configure CSV/Excel/REST/Postgres sources",
    href: "/dashboard/data",
    metric: "4 source types",
  },
  {
    id: "etl",
    label: "ETL Jobs",
    icon: "refresh",
    description: "Monitor pipeline runs, rejected rows, schedules",
    href: "/dashboard/data",
    badge: "Jobs",
  },
  {
    id: "scheduler",
    label: "Scheduler",
    icon: "clock",
    description: "View and manage cron jobs (retrain, anomaly, reports)",
    href: "/dashboard/admin/scheduler",
    metric: "8 scheduled jobs",
  },
  {
    id: "ai-providers",
    label: "AI Providers",
    icon: "spark",
    description: "Monitor Groq/Gemini health, latency, circuit breakers",
    href: "/dashboard/ai",
    metric: "2 providers",
    status: "ok",
  },
  {
    id: "storage",
    label: "Storage",
    icon: "download",
    description: "S3/local file artifacts, uploads, reports",
    href: "/dashboard/admin/storage",
    metric: "FileStorage abstraction",
  },
  {
    id: "security",
    label: "Security",
    icon: "lock",
    description: "SSRF protection, upload hardening, rate limits",
    href: "/dashboard/admin/security",
    metric: "Hardened",
    status: "ok",
  },
];

export default function AdminControlCenterClient() {
  const { user } = useAuth();
  const isSuper = !!user?.is_super_admin;
  const { data: health } = useQuery<SystemHealthOut>({
    queryKey: ["health", "system"],
    queryFn: () => apiGet<SystemHealthOut>("/health/system"),
    staleTime: 60_000,
  });

  const { data: aiUsage } = useQuery<AiUsageOut>({
    queryKey: ["ai-usage"],
    queryFn: () => apiGet<AiUsageOut>("/ai/usage"),
    staleTime: 60_000,
  });

  const overallStatus = health?.overall || "ok";
  const statusColor = overallStatus === "ok" ? "success" : overallStatus === "degraded" ? "warning" : "destructive";

  return (
    <>
      <PageHeader
        title="Admin Control Center"
        subtitle="Admin."
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColor} className="text-xs">
              Platform: {overallStatus}
            </Badge>
            {aiUsage && (
              <Badge variant="secondary" className="text-xs">
                AI Cost (14d): ${aiUsage.total_est_cost_usd.toFixed(4)}
              </Badge>
            )}
          </div>
        }
      />

      {isSuper && (
        <div className="mb-6">
          <PendingApprovals />
        </div>
      )}

      {/* Platform Health Overview */}
      <Panel title="Platform Health" subtitle={health ? `Generated ${new Date(health.generated_at).toLocaleTimeString()}` : "Loading…"}>
        {health ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {health.components.map((c: any) => (
              <div
                key={c.name}
                className={clsx(
                  "p-4 rounded-xl border",
                  c.status === "ok" ? "bg-green-50 border-green-200" :
                  c.status === "degraded" ? "bg-warn-50 border-warn-200" :
                  "bg-destructive-50 border-destructive-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{c.name}</span>
                  <Badge variant={c.status === "ok" ? "success" : c.status === "degraded" ? "warning" : "destructive"} className="text-xs">
                    {c.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{c.detail}</p>
                {c.latency_ms !== null && (
                  <p className="mt-1 text-xs text-ink-muted">Latency: {c.latency_ms.toFixed(0)} ms</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-ink-muted">Loading platform health…</div>
        )}
      </Panel>

      {/* Admin Sections Grid */}
      <Panel title="Administration Sections" subtitle="Click a card to manage that area">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className={clsx(
                "p-5 rounded-xl border border-border bg-white hover:bg-bg-soft hover:border-primary/50 transition-colors",
                "flex flex-col gap-2"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary">
                    <Icon name={section.icon as any} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-ink">{section.label}</p>
                    <p className="text-xs text-ink-muted">{section.description}</p>
                  </div>
                </div>
                {section.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {section.badge}
                  </Badge>
                )}
              </div>
              {section.metric && (
                <p className="text-xs text-ink-muted mt-1">{section.metric}</p>
              )}
              {section.status && (
                <Badge variant={section.status === "ok" ? "success" : "warning"} className="text-xs w-fit mt-1">
                  {section.status}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </Panel>

      {/* Quick Actions */}
      <Panel title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/users"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add User
          </Link>
          <Link
            href="/dashboard/data"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft"
          >
            <Icon name="upload" className="h-4 w-4" />
            Upload Data
          </Link>
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft"
          >
            <Icon name="download" className="h-4 w-4" />
            Generate Report
          </Link>
          <Link
            href="/dashboard/permissions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft"
          >
            <Icon name="shield" className="h-4 w-4" />
            Edit Permissions
          </Link>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft"
          >
            <Icon name="refresh" className="h-4 w-4" />
            Trigger DQ Audit
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft"
          >
            <Icon name="spark" className="h-4 w-4" />
            Retrain Models
          </button>
        </div>
      </Panel>
    </>
  );
}