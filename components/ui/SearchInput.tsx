"use client";

import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/lib/use-debounce";
import Icon from "./Icon";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  debounceMs = 300,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
}) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, debounceMs);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange(debounced);
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="relative">
      <Icon
        name="search"
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
      />
      <input
        ref={ref}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
      />
      {local && (
        <button
          onClick={() => { setLocal(""); onChange(""); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
