// Lightweight, dependency-free Markdown renderer for AI replies.
// XSS-safe: raw HTML in model output is escaped before any parsing.

import { Fragment, ReactNode } from "react";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Renders [text](url) links in an already-escaped string.
function linkify(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <a
        key={key++}
        href={m[2]}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      >
        {m[1]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function renderInline(text: string): ReactNode {
  const escaped = escapeHtml(text);
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(escaped)) !== null) {
    if (m.index > last)
      parts.push(<Fragment key={key++}>{linkify(escaped.slice(last, m.index))}</Fragment>);
    const tok = m[1];
    if (tok.startsWith("`") && tok.endsWith("`")) {
      parts.push(
        <code key={key++} className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em] text-primary-700">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      parts.push(
        <strong key={key++} className="font-semibold text-ink">
          {renderInline(tok.slice(2, -2))}
        </strong>,
      );
    } else if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      parts.push(<em key={key++} className="italic">{renderInline(tok.slice(1, -1))}</em>);
    } else {
      parts.push(<Fragment key={key++}>{linkify(tok)}</Fragment>);
    }
    last = m.index + m[0].length;
  }
  if (last < escaped.length)
    parts.push(<Fragment key={key++}>{linkify(escaped.slice(last))}</Fragment>);
  return <>{parts}</>;
}

function isTableLine(line: string): boolean {
  return line.startsWith("|") && line.endsWith("|");
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function Table({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse bg-white text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-bg-soft">
            {head.map((c, i) => (
              <th key={i} className="px-3 py-2 font-semibold text-ink" scope="col">{renderInline(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((c, j) => (
                <td key={j} className="px-3 py-2 text-ink-soft">{renderInline(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function listItems(lines: string[], ordered: boolean): { items: string[]; rest: string[] } {
  const items: string[] = [];
  const pattern = ordered ? /^\d+[.)]\s+/ : /^[-*+]\s+/;
  let rest: string[] = [];
  items.push(lines[0].replace(pattern, ""));
  for (let i = 1; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      items.push(lines[i].replace(pattern, ""));
    } else {
      rest = lines.slice(i);
      break;
    }
  }
  return { items, rest };
}

export function Markdown({ text }: { text: string }) {
  if (!text.trim()) return null;
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-lg bg-ink/[0.06] px-3 py-2.5 font-mono text-xs leading-relaxed text-ink">
          {buf.join("\n")}
        </pre>,
      );
      continue;
    }

    if (isTableLine(line) && i + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[i + 1])) {
      const rows: string[][] = [parseTableRow(line)];
      i += 2;
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push(<Table key={key++} rows={rows} />);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const { items, rest } = listItems(lines.slice(i), false);
      blocks.push(
        <ul key={key++} className="my-1 list-disc space-y-0.5 pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      i = lines.length - rest.length;
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const { items, rest } = listItems(lines.slice(i), true);
      blocks.push(
        <ol key={key++} className="my-1 list-decimal space-y-0.5 pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>,
      );
      i = lines.length - rest.length;
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) {
      const level = line.match(/^(#{1,6})/)?.[1].length ?? 1;
      const content = line.replace(/^#{1,6}\s+/, "");
      const Tag = ["h1", "h2", "h3", "h4", "h5", "h6"][level - 1] as "h4";
      blocks.push(
        <Tag key={key++} className="mb-1 mt-3 font-semibold text-ink first:mt-0">
          {renderInline(content)}
        </Tag>,
      );
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="my-1 border-l-2 border-primary/40 pl-3 italic text-ink-soft">
          {buf.map((b, j) => (
            <p key={j}>{renderInline(b)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-2 border-border" />);
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }

    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^[#>`|]/.test(lines[i]) &&
      !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-1 leading-relaxed">{renderInline(buf.join(" "))}</p>,
    );
  }

  return <div className="space-y-1 text-sm">{blocks}</div>;
}