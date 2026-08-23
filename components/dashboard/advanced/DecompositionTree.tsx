"use client";

import { useState } from "react";
import { nprCompact } from "@/lib/api";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useDecompTree } from "@/lib/advanced";

const MAX_BAR = 240;

type Node = { name: string; value: number; share_pct: number; children?: Node[] };
type TreeResp = { metric: string; hierarchy: string[]; root: Node; total: number };

function Row({ node, depth, levels }: { node: Node; depth: number; levels: string[] }) {
  const f = usePbFilters();
  const [open, setOpen] = useState(depth < 2);
  const dim = levels[depth] as "region" | "channel" | "category" | undefined;
  const clickable = !!dim && depth > 0;
  const active = clickable ? f[dim] === node.name : false;
  return (
    <div>
      <div
        className="flex items-center gap-2 py-0.5"
        style={{ paddingLeft: depth * 14 }}
      >
        {node.children?.length ? (
          <button onClick={() => setOpen(!open)} className="w-4 text-xs text-ink-muted">
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <button
          disabled={!clickable}
          onClick={() => clickable && f.toggleDim(dim, node.name)}
          className={`truncate text-left text-sm ${active ? "font-semibold text-primary" : "text-ink-soft"} ${clickable ? "hover:underline" : ""}`}
          title={clickable ? `Filter by ${dim}=${node.name}` : undefined}
        >
          {node.name}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-2 rounded bg-primary/70" style={{ width: Math.max(2, (node.share_pct / 100) * MAX_BAR) }} />
          <span className="w-28 text-right font-mono text-xs text-ink">{nprCompact(node.value)}</span>
          <span className="w-12 text-right text-xs text-ink-muted">{node.share_pct}%</span>
        </div>
      </div>
      {open && node.children?.map((c) => <Row key={c.name} node={c} depth={depth + 1} levels={levels} />)}
    </div>
  );
}

export default function DecompositionTree({ metric, hierarchy }: { metric: string; hierarchy: string }) {
  const f = usePbFilters();
  const { data, loading } = useDecompTree(f, metric, hierarchy);
  const resp = data as TreeResp | null;
  const levels = (resp?.hierarchy as string[]) ?? hierarchy.split(",");
  return (
    <Panel
      title="Decomposition Tree"
      subtitle={`${metric} by ${levels.join(" → ")} — click a node to cross-filter`}
    >
      {loading && <Loading />}
      {!loading && !resp?.root && <Empty />}
      {resp?.root && (
        <div className="max-h-[460px] overflow-auto">
          <Row node={resp.root} depth={0} levels={levels} />
        </div>
      )}
    </Panel>
  );
}
