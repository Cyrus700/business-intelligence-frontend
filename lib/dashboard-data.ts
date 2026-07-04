// Sample preview data for panels whose live sources land in later phases:
//   FORECAST_SERIES + ANOMALIES → Phase 4 (ML engine)
//   AI_INSIGHTS               → Phase 5 (insight generation)
// Everything else moved to live API data in Phase 3 (lib/api.ts).

export const FORECAST_SERIES = [
  { day: "W1", actual: 42, forecast: null as number | null, lo: null as number | null, hi: null as number | null },
  { day: "W2", actual: 48, forecast: null, lo: null, hi: null },
  { day: "W3", actual: 45, forecast: null, lo: null, hi: null },
  { day: "W4", actual: 53, forecast: null, lo: null, hi: null },
  { day: "W5", actual: 58, forecast: null, lo: null, hi: null },
  { day: "W6", actual: 61, forecast: 61, lo: 61, hi: 61 },
  { day: "W7", actual: null, forecast: 66, lo: 60, hi: 72 },
  { day: "W8", actual: null, forecast: 71, lo: 62, hi: 80 },
  { day: "W9", actual: null, forecast: 77, lo: 65, hi: 89 },
  { day: "W10", actual: null, forecast: 83, lo: 68, hi: 98 },
];

export const AI_INSIGHTS = [
  {
    tone: "accent",
    title: "Revenue trending above target",
    body: "September is pacing 12.7% above forecast, driven by the Online category.",
  },
  {
    tone: "warn",
    title: "Orders dipping in Wholesale",
    body: "Wholesale orders fell 3.2% week-over-week — worth a closer look.",
  },
  {
    tone: "primary",
    title: "Restock recommendation",
    body: "Demand in Region B is forecast to exceed inventory by Friday. Restock +18%.",
  },
];

export const ANOMALIES = [
  { sev: "high", title: "Sales spike — Region B", time: "2 min ago", value: "+214%" },
  { sev: "med", title: "Refund rate above norm", time: "1 hr ago", value: "+6.4%" },
  { sev: "low", title: "Login attempts elevated", time: "3 hrs ago", value: "+18%" },
];
