import { clsx } from "@/lib/cx";
import { ACTIVITY } from "@/lib/dashboard-data";

const STATUS: Record<string, string> = {
  Paid: "bg-accent-50 text-accent",
  Pending: "bg-warn-50 text-warn",
  Failed: "bg-red-50 text-red-600",
};

export default function ActivityTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-ink-muted">
            <th className="pb-3 font-medium">Order</th>
            <th className="pb-3 font-medium">Customer</th>
            <th className="pb-3 font-medium">Amount</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 text-right font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ACTIVITY.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-bg-soft">
              <td className="py-3 font-mono text-ink-soft">{row.id}</td>
              <td className="py-3 font-medium text-ink">{row.customer}</td>
              <td className="py-3 font-mono text-ink">{row.amount}</td>
              <td className="py-3">
                <span
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    STATUS[row.status],
                  )}
                >
                  {row.status}
                </span>
              </td>
              <td className="py-3 text-right text-ink-soft">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
