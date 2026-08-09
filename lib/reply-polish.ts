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

export function polishReply(text: string): string {
  return text
    .split("\n")
    .map(polishLine)
    .join("\n");
}
