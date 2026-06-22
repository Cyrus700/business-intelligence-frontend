// Mock analytics data for the dashboard. Stable, hand-tuned numbers so the
// charts always look good in the demo.

export const KPIS = [
  {
    key: "revenue",
    label: "Revenue",
    value: "$1.24M",
    delta: 12.4,
    spark: [32, 40, 36, 52, 48, 61, 58, 72, 80],
    tone: "primary",
  },
  {
    key: "users",
    label: "Active users",
    value: "8,420",
    delta: 8.1,
    spark: [40, 42, 48, 45, 53, 58, 64, 70, 76],
    tone: "accent",
  },
  {
    key: "orders",
    label: "Orders",
    value: "3,127",
    delta: -3.2,
    spark: [60, 58, 62, 55, 50, 53, 48, 46, 44],
    tone: "warn",
  },
  {
    key: "anomalies",
    label: "Anomalies",
    value: "2",
    delta: -50,
    spark: [5, 4, 6, 3, 4, 2, 3, 2, 2],
    tone: "ink",
  },
] as const;

export const REVENUE_SERIES = [
  { month: "Jan", revenue: 62000, target: 60000 },
  { month: "Feb", revenue: 71000, target: 65000 },
  { month: "Mar", revenue: 68000, target: 70000 },
  { month: "Apr", revenue: 84000, target: 75000 },
  { month: "May", revenue: 92000, target: 82000 },
  { month: "Jun", revenue: 101000, target: 90000 },
  { month: "Jul", revenue: 96000, target: 95000 },
  { month: "Aug", revenue: 118000, target: 102000 },
  { month: "Sep", revenue: 124000, target: 110000 },
];

export const CATEGORY_SERIES = [
  { category: "Retail", value: 4200 },
  { category: "Wholesale", value: 3100 },
  { category: "Online", value: 5400 },
  { category: "Services", value: 2600 },
  { category: "Exports", value: 1900 },
];

export const SOURCE_SERIES = [
  { name: "Direct", value: 38, color: "#4f46e5" },
  { name: "Organic", value: 29, color: "#10b981" },
  { name: "Referral", value: 19, color: "#8b5cf6" },
  { name: "Social", value: 14, color: "#f59e0b" },
];

// Forecast: historical points then a predicted tail with a confidence band.
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

export const ACTIVITY = [
  { id: "#10293", customer: "Himalayan Bank", amount: "$12,400", status: "Paid", date: "Sep 24" },
  { id: "#10292", customer: "Everest Logistics", amount: "$8,150", status: "Pending", date: "Sep 24" },
  { id: "#10291", customer: "KTM Fintech", amount: "$3,920", status: "Paid", date: "Sep 23" },
  { id: "#10290", customer: "Pokhara Trading", amount: "$6,780", status: "Failed", date: "Sep 23" },
  { id: "#10289", customer: "Annapurna SME", amount: "$2,310", status: "Paid", date: "Sep 22" },
];
