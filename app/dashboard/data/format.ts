// Display helpers for the data integration page.

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function timeAgo(iso: string): string {
  // TimestampAgent: handle naive DB timestamps as UTC, handle clock skew, show real date after 7d
  const normalized = iso && !iso.endsWith("Z") && !iso.includes("+") && !iso.includes("T") ? iso : iso;
  // If backend sent naive "2026-09-09T10:00:00" treat as UTC by appending Z
  const probe = normalized && !normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized) && normalized.includes("T") ? `${normalized}Z` : normalized;
  const then = new Date(probe).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const seconds = Math.floor(diffMs / 1000);
  // Future (clock skew): show "just now" briefly but hint skew if >2m ahead
  if (seconds < 0) {
    if (seconds > -120) return "just now";
    return `in ${Math.abs(Math.floor(seconds / 60))}m`;
  }
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  // After 7d show full date + year if not current year
  return formatDateTime(iso);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const probe = iso && !iso.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(iso) && iso.includes("T") ? `${iso}Z` : iso;
  // Business TZ is Asia/Kathmandu (+05:45) — show real wall-clock in that TZ but also hint UTC
  try {
    return new Date(probe).toLocaleString(undefined, {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return new Date(probe).toLocaleString();
  }
}

export function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "—";
  const ms = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
  if (ms < 1000) return "<1s";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
