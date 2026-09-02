"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, queryKeys } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";

type SecurityStatus = {
  ssrf: {
    enabled: boolean;
    blocked_ranges: string[];
    blocked_tlds: string[];
    last_blocked?: string;
    blocked_count_24h: number;
  };
  uploads: {
    enabled: boolean;
    allowed_extensions: string[];
    max_size_mb: number;
    rejected_count_24h: number;
    last_rejected?: string;
  };
  rate_limit: {
    enabled: boolean;
    requests_per_minute: number;
    current_usage_pct: number;
  };
  audit: {
    enabled: boolean;
    events_24h: number;
    last_event?: string;
  };
  auth: {
    jwt_expiry_hours: number;
    bcrypt_cost: number;
    google_oauth: boolean;
    failed_logins_24h: number;
    last_failed?: string;
  };
};

function statusBadge(enabled: boolean) {
  return (
    <Badge variant={enabled ? "success" : "destructive"} className="text-xs">
      {enabled ? "Enabled" : "Disabled"}
    </Badge>
  );
}

function metricCard(label: string, value: string | number, trend?: string) {
  return (
    <div className="p-4 bg-white rounded-xl border border-border">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      {trend && <p className="mt-1 text-xs text-ink-muted">{trend}</p>}
    </div>
  );
}

export default function SecurityClient() {
  const { data, isLoading, error } = useQuery<SecurityStatus>({
    queryKey: ["admin", "security"],
    queryFn: () => apiGet("/admin/security"),
    staleTime: 60_000,
  });

  return (
    <>
      <PageHeader
        title="Security Center"
        subtitle="Security."
      />

      <Panel title="Security Overview" subtitle={data ? "All systems operational" : "Loading…"}>
        {isLoading ? (
          <div className="text-center py-8 text-ink-muted">Loading security status…</div>
        ) : error ? (
          <div className="text-center py-8 text-warn">Failed to load security status</div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "SSRF Blocks (24h)", value: data.ssrf.blocked_count_24h, trend: data.ssrf.last_blocked ? `Last: ${new Date(data.ssrf.last_blocked).toLocaleTimeString()}` : "None" },
              { label: "Upload Rejections (24h)", value: data.uploads.rejected_count_24h, trend: data.uploads.last_rejected ? `Last: ${new Date(data.uploads.last_rejected).toLocaleTimeString()}` : "None" },
              { label: "Rate Limit Usage", value: `${data.rate_limit.current_usage_pct}%`, trend: `${data.rate_limit.requests_per_minute} req/min` },
              { label: "Audit Events (24h)", value: data.audit.events_24h, trend: data.audit.last_event ? `Last: ${new Date(data.audit.last_event).toLocaleTimeString()}` : "None" },
              { label: "Failed Logins (24h)", value: data.auth.failed_logins_24h, trend: data.auth.last_failed ? `Last: ${new Date(data.auth.last_failed).toLocaleTimeString()}` : "None" },
            ].map((m, i) => (
              metricCard(m.label, String(m.value), m.trend)
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel title="SSRF Protection" subtitle={data ? `Status: ${data.ssrf.enabled ? "Active" : "Inactive"}` : "Loading…"}>
        {isLoading || error || !data ? null : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">SSRF Protection</span>
              {statusBadge(data.ssrf.enabled)}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="p-4 bg-white rounded-xl border border-border">
                <p className="text-sm text-ink-soft">Blocked CIDR Ranges</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.ssrf.blocked_ranges.map((r, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-mono">{r}</Badge>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-border">
                <p className="text-sm text-ink-soft">Blocked TLDs</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.ssrf.blocked_tlds.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-border">
              <p className="text-sm text-ink-soft">24h Stats</p>
              <p className="mt-1 text-lg font-bold text-ink">{data.ssrf.blocked_count_24h} requests blocked</p>
              {data.ssrf.last_blocked && (
                <p className="text-xs text-ink-muted">Last blocked: {new Date(data.ssrf.last_blocked).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Upload Hardening" subtitle={data ? `Status: ${data.uploads.enabled ? "Active" : "Inactive"}` : "Loading…"}>
        {isLoading || error || !data ? null : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Upload Validation</span>
              {statusBadge(data.uploads.enabled)}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="p-4 bg-white rounded-xl border border-border">
                <p className="text-sm text-ink-soft">Allowed Extensions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.uploads.allowed_extensions.map((e, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{e}</Badge>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-border">
                <p className="text-sm text-ink-soft">Max File Size</p>
                <p className="mt-1 text-2xl font-bold text-ink">{data.uploads.max_size_mb} MB</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-border">
                <p className="text-sm text-ink-soft">24h Rejections</p>
                <p className="mt-1 text-2xl font-bold text-warn">{data.uploads.rejected_count_24h}</p>
                {data.uploads.last_rejected && (
                  <p className="text-xs text-ink-muted">Last: {new Date(data.uploads.last_rejected).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Rate Limiting" subtitle={data ? `Status: ${data.rate_limit.enabled ? "Active" : "Inactive"}` : "Loading…"}>
        {isLoading || error || !data ? null : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Rate Limiter</span>
              {statusBadge(data.rate_limit.enabled)}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {metricCard("Limit", `${data.rate_limit.requests_per_minute} req/min`)}
              {metricCard("Current Usage", `${data.rate_limit.current_usage_pct}%`)}
              <div className="p-4 bg-white rounded-xl border border-border">
                <p className="text-sm text-ink-soft">Usage Bar</p>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, data.rate_limit.current_usage_pct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Authentication" subtitle={data ? `JWT: ${data.auth.jwt_expiry_hours}h · Bcrypt: ${data.auth.bcrypt_cost}` : "Loading…"}>
        {isLoading || error || !data ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {metricCard("JWT Expiry", `${data.auth.jwt_expiry_hours}h`)}
              {metricCard("Bcrypt Cost", String(data.auth.bcrypt_cost))}
              {metricCard("Google OAuth", data.auth.google_oauth ? "Enabled" : "Disabled")}
              {metricCard("Failed Logins (24h)", String(data.auth.failed_logins_24h), data.auth.last_failed ? `Last: ${new Date(data.auth.last_failed).toLocaleString()}` : "None")}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Audit Logging" subtitle={data ? `Status: ${data.audit.enabled ? "Active" : "Inactive"}` : "Loading…"}>
        {isLoading || error || !data ? null : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Audit Middleware</span>
              {statusBadge(data.audit.enabled)}
            </div>
            {metricCard("Events (24h)", String(data.audit.events_24h), data.audit.last_event ? `Last: ${new Date(data.audit.last_event).toLocaleString()}` : "None")}
          </div>
        )}
      </Panel>
    </>
  );
}