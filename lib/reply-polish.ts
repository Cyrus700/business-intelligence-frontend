// Deterministic reply styler: upgrades AI replies into clean, scannable
// markdown regardless of how loosely the LLM followed the formatting rules.
// Mirrors `polish_reply` in business-intelligence-backend/app/services/ai/provider.py.

function polishLine(line: string): string {
  const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
  if (bullet) line = `${bullet[1]}- ${bullet[2]}`;

  if (line.includes("**") || line.includes("|") || line.includes("://") || !line.trim()) {
    return line;
  }

  const label = line.match(/^(\s*(?:-\s+)?)(\S[^:]{0,39}):\s*(.*)$/);
  if (label) {
    const rest = label[3];
    return rest ? `${label[1]}**${label[2]}:** ${rest}` : `${label[1]}**${label[2]}:**`;
  }
  return line;
}

function stripReasoning(text: string): string {
  if (!text) return text;
  // 1) XML think tags
  text = text.replace(/<\s*think[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi, "");
  text = text.replace(/<\s*thinking[^>]*>[\s\S]*?<\s*\/\s*thinking\s*>/gi, "");
  text = text.replace(/<\s*analysis[^>]*>[\s\S]*?<\s*\/\s*analysis\s*>/gi, "");
  text = text.replace(/<\s*reasoning[^>]*>[\s\S]*?<\s*\/\s*reasoning\s*>/gi, "");
  if (text.toLowerCase().includes("<think") && !text.toLowerCase().includes("</think")) {
    text = text.replace(/<\s*think[^>]*>[\s\S]*/gi, "");
  }
  const leakMarkers = [
    "here's a thinking process",
    "analyze user input",
    "check rules &",
    "check rules and",
    "according to rules",
    "rule 1c",
    "rule 1b",
    "rule 1c2",
    "1c. universal",
    "snapshot covers only the last 30 days",
    "must call: query_kpis",
    "must call the tools with that date range",
  ];
  const lowHead = text.slice(0, 2500).toLowerCase();
  if (leakMarkers.some((m) => lowHead.includes(m))) {
    const lines = text.split("\n");
    let leakEnd = 0;
    for (let i = 0; i < lines.length; i++) {
      const ll = lines[i].toLowerCase();
      const isLeak =
        leakMarkers.some((m) => ll.includes(m)) ||
        ll.trim().startsWith("1. analyze") ||
        (ll.includes("user asks:") && ll.includes("anomal")) ||
        ll.includes("this is a status/overview") ||
        (ll.includes("must call:") && ll.includes("query_kpis")) ||
        (ll.includes("get_data_coverage") && ll.includes("get_anomalies") && ll.length < 200);
      if (isLeak) {
        leakEnd = i + 1;
        continue;
      }
      if (leakEnd > 0) {
        if (lines[i].trim() === "") continue;
        const window = lines.slice(i, i + 3).join(" ").toLowerCase();
        if (!leakMarkers.some((m) => window.includes(m)) && !window.includes("analyze user input")) {
          break;
        }
        if (ll.trim().startsWith("-") && ["user asks", "according to", "for 'whats", "query_kpis"].some((x) => ll.includes(x))) {
          leakEnd = i + 1;
          continue;
        }
      }
    }
    if (leakEnd > 0) {
      const remaining = lines.slice(leakEnd).join("\n").trim();
      if (remaining.length < 20) return "";
      text = remaining;
    }
  }
  text = text.replace(/^\s*1\.\s*analyze user input:[\s\S]*?(?=\n#{1,6}\s|\n\*\*|\n- |\Z)/gi, "");
  return text.trim();
}

export function polishReply(text: string): string {
  if (!text) return text;
  const stripped = stripReasoning(text);
  if (!stripped.trim()) return "";
  return stripped
    .split("\n")
    .map(polishLine)
    .join("\n");
}
