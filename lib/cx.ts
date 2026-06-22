// Tiny className joiner — avoids a dependency for trivial conditional classes.
export function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
