"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import PagedTransactions from "@/components/dashboard/live/PagedTransactions";
import { Modal } from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { RangePicker, useFilters } from "@/lib/filters";
import { useRole, hasMinRole } from "@/lib/use-role";
import {
  downloadReport,
  createReportSchedule,
  deleteReportSchedule,
  updateReportSchedule,
  generateReport as apiGenerateReport,
  getReportSchedules,
  getReports,
  type ReportOut,
  type ReportRequest,
  type ReportScheduleOut,
} from "@/lib/api";

const REPORTS_KEY = ["reports"] as const;
const SCHEDULES_KEY = ["report-schedules"] as const;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Download button — fetches the file with the auth token attached and
// saves it via an object URL, since a plain <a href> can't carry a bearer
// token and the API 401s on unauthenticated GETs. ─────────────────────────
function DownloadButton({ report }: { report: ReportOut }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setState("loading");
    try {
      await downloadReport(report);
      setState("idle");
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-ink hover:bg-bg-soft disabled:opacity-60"
    >
      {state === "loading" ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
      ) : (
        <Icon name="download" className="h-3.5 w-3.5" />
      )}
      {state === "error" ? "Failed — retry" : "Download"}
    </button>
  );
}

function ReportList() {
  const { data, error, isLoading } = useQuery<ReportOut[]>({
    queryKey: REPORTS_KEY,
    queryFn: getReports,
  });
  if (error) return <p className="text-sm text-warn">{(error as Error).message}</p>;
  if (isLoading) return <div className="h-16 animate-pulse rounded-xl bg-bg-soft" />;
  if (!data || data.length === 0)
    return (
      <p className="text-sm text-ink-soft">
        No reports yet — use <span className="font-medium">Generate report</span> above to create
        one.
      </p>
    );
  return (
    <div className="space-y-2">
      {data.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium text-ink capitalize">
              {r.report_type.replace("_", " ")} report
            </p>
            <p className="text-xs text-ink-muted">
              {fmtDate(r.period_start)} – {fmtDate(r.period_end)} · {r.format.toUpperCase()}
            </p>
          </div>
          <DownloadButton report={r} />
        </div>
      ))}
    </div>
  );
}

// ── Generate report modal ──────────────────────────────────────────────
function GenerateReportModal({ onClose }: { onClose: () => void }) {
  const { filters } = useFilters();
  const [periodStart, setPeriodStart] = useState(filters.from);
  const [periodEnd, setPeriodEnd] = useState(filters.to);
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: ReportRequest) => apiGenerateReport(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (periodEnd < periodStart) {
      setError("End date must be on or after the start date.");
      return;
    }
    mutation.mutate({ period_start: periodStart, period_end: periodEnd, format });
  }

  return (
    <Modal title="Generate report" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">{error}</div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">From</span>
            <input
              type="date"
              required
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">To</span>
            <input
              type="date"
              required
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
        </div>
        <p className="text-xs text-ink-muted">
          Defaults to the range currently selected on this page ({filters.from} – {filters.to}).
          Adjust it above if you need a different period.
        </p>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Format</span>
          <div className="flex gap-2">
            {(["pdf", "xlsx"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={
                  format === f
                    ? "flex-1 rounded-xl border border-primary bg-primary/5 px-3 py-2 text-sm font-medium text-primary"
                    : "flex-1 rounded-xl border border-border px-3 py-2 text-sm text-ink-soft hover:bg-bg-soft"
                }
              >
                {f === "pdf" ? "PDF (charts + tables)" : "Excel (raw sheets)"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600 disabled:opacity-60"
          >
            {mutation.isPending && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            Generate
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Schedule report modal ──────────────────────────────────────────────
function ScheduleReportModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: schedules, isLoading } = useQuery<ReportScheduleOut[]>({
    queryKey: SCHEDULES_KEY,
    queryFn: getReportSchedules,
  });

  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: createReportSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULES_KEY }),
    onError: (e: Error) => setError(e.message),
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateReportSchedule(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULES_KEY }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteReportSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULES_KEY }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    createMutation.mutate({
      frequency,
      format,
      day_of_week: frequency === "weekly" ? dayOfWeek : undefined,
      day_of_month: frequency === "monthly" ? dayOfMonth : undefined,
    });
  }

  return (
    <Modal title="Scheduled reports" onClose={onClose} wide>
      <div className="max-h-[60vh] overflow-y-auto">
        <div className="mb-5">
          <h3 className="mb-2 text-sm font-medium text-ink">Active schedules</h3>
          {isLoading && <div className="h-10 animate-pulse rounded-xl bg-bg-soft" />}
          {!isLoading && (!schedules || schedules.length === 0) && (
            <p className="text-sm text-ink-soft">
              No schedules yet — a weekly or monthly digest will appear here once created below.
            </p>
          )}
          <div className="space-y-2">
            {(schedules ?? []).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink capitalize">
                    {s.frequency} · {s.format.toUpperCase()}
                    {s.frequency === "weekly" && s.day_of_week !== null
                      ? ` on ${WEEKDAYS[s.day_of_week]}`
                      : ""}
                    {s.frequency === "monthly" && s.day_of_month !== null
                      ? ` on day ${s.day_of_month}`
                      : ""}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Next run {fmtDate(s.next_run_at)}
                    {s.last_run_at ? ` · last sent ${fmtDate(s.last_run_at.slice(0, 10))}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      toggleMutation.mutate({ id: s.id, is_active: !s.is_active })
                    }
                    className={
                      s.is_active
                        ? "inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-ink hover:bg-bg-soft"
                        : "inline-flex h-8 items-center rounded-lg border border-primary bg-primary/5 px-3 text-xs font-medium text-primary"
                    }
                  >
                    {s.is_active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(s.id)}
                    className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-warn hover:bg-warn-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 border-t border-border pt-5">
          <h3 className="text-sm font-medium text-ink">New schedule</h3>
          {error && <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">{error}</div>}

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Frequency</span>
            <div className="flex gap-2">
              {(["weekly", "monthly"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={
                    frequency === f
                      ? "flex-1 rounded-xl border border-primary bg-primary/5 px-3 py-2 text-sm font-medium capitalize text-primary"
                      : "flex-1 rounded-xl border border-border px-3 py-2 text-sm capitalize text-ink-soft hover:bg-bg-soft"
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {frequency === "weekly" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Day of week</span>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Day of month</span>
              <select
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Format</span>
            <div className="flex gap-2">
              {(["pdf", "xlsx"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={
                    format === f
                      ? "flex-1 rounded-xl border border-primary bg-primary/5 px-3 py-2 text-sm font-medium text-primary"
                      : "flex-1 rounded-xl border border-border px-3 py-2 text-sm text-ink-soft hover:bg-bg-soft"
                  }
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600 disabled:opacity-60"
            >
              {createMutation.isPending && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              Add schedule
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default function ReportsClient() {
  const role = useRole();
  const canGenerate = hasMinRole(role, "manager");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const generatedRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Browse and drill into your transactional data."
        action={
          <div className="flex items-center gap-2">
            <RangePicker />
            {canGenerate && (
              <button
                onClick={() => setShowGenerate(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600"
              >
                <Icon name="table" className="h-4 w-4" />
                Generate report
              </button>
            )}
          </div>
        }
      />

      {role === "analyst" && (
        <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          You can view and download reports. Contact a manager to generate new ones.
        </div>
      )}

      {canGenerate && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => setShowGenerate(true)}
            className="rounded-xl border border-border p-4 text-left hover:bg-bg-soft"
          >
            <span className="text-sm font-medium text-ink">Export as PDF</span>
            <p className="mt-0.5 text-xs text-ink-muted">Selected period summary</p>
          </button>
          <button
            onClick={() => setShowSchedule(true)}
            className="rounded-xl border border-border p-4 text-left hover:bg-bg-soft"
          >
            <span className="text-sm font-medium text-ink">Schedule report</span>
            <p className="mt-0.5 text-xs text-ink-muted">Weekly or monthly digest</p>
          </button>
          <button
            onClick={() => generatedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="block rounded-xl border border-border p-4 text-left hover:bg-bg-soft"
          >
            <span className="text-sm font-medium text-ink">Browse reports</span>
            <p className="mt-0.5 text-xs text-ink-muted">View all generated reports</p>
          </button>
        </div>
      )}

      <div ref={generatedRef}>
        <Panel title="Generated reports" subtitle="Latest reports">
          <ReportList />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="All transactions" subtitle="Selected period">
          <PagedTransactions />
        </Panel>
      </div>

      {showGenerate && <GenerateReportModal onClose={() => setShowGenerate(false)} />}
      {showSchedule && <ScheduleReportModal onClose={() => setShowSchedule(false)} />}
    </>
  );
}
