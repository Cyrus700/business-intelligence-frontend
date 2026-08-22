"use client";

// Forecast panel: the live prediction chart (history + confidence band) plus
// the accuracy scorecard, with an admin-only "Retrain now" action wired to
// POST /forecasts/retrain — previously the Analytics page only showed the
// accuracy card, which reads as permanently broken ("No models trained yet")
// with no way to fix it short of a backend shell.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/Icon";
import { retrainForecasts } from "@/lib/api";
import { useRole } from "@/lib/use-role";
import LiveForecast from "./LiveForecast";
import ForecastAccuracy from "./ForecastAccuracy";

export default function ForecastSection() {
  const role = useRole();
  const canRetrain = role === "admin";
  const queryClient = useQueryClient();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleRetrain() {
    setState("loading");
    setMessage("");
    try {
      const result = await retrainForecasts();
      const summary = result.retrained
        .map((r) => `${r.target.replace("_daily", "")} (${r.model}${r.mape != null ? `, ${r.mape}% MAPE` : ""})`)
        .join(", ");
      setMessage(result.retrained.length ? `Retrained: ${summary}` : "No targets had enough data to retrain.");
      setState("done");
      await queryClient.invalidateQueries({ queryKey: ["/forecasts"] });
      await queryClient.invalidateQueries({ queryKey: ["/forecasts/accuracy"] });
      await queryClient.invalidateQueries({ queryKey: ["/trends"] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Retrain failed");
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 6000);
    }
  }

  return (
    <div>
      {canRetrain && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            Models retrain automatically every Monday. Trigger an off-cycle run after a large
            data upload.
          </p>
          <button
            onClick={handleRetrain}
            disabled={state === "loading"}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-bg-soft disabled:opacity-60"
          >
            {state === "loading" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
            ) : (
              <Icon name="spark" className="h-3.5 w-3.5" />
            )}
            {state === "loading" ? "Retraining…" : "Retrain now"}
          </button>
        </div>
      )}
      {message && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            state === "error" ? "bg-warn-50 text-warn" : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <LiveForecast />

      <div className="mt-6 border-t border-border pt-6">
        <p className="mb-3 text-sm font-medium text-ink">Model accuracy by target</p>
        <ForecastAccuracy />
      </div>
    </div>
  );
}
