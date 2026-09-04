import type { ReactNode } from "react";
import clsx from "clsx";

function Badge({ kind }: { kind: "do" | "dont" }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full px-[var(--spacing-3)] py-[var(--spacing-0-5)] typography-standard-label-small-bold text-white",
        kind === "do" ? "bg-green-700" : "bg-red-600",
      )}
    >
      {kind === "do" ? "Do" : "Don't"}
    </span>
  );
}

/** Guide/Usage の Use when / Do not use when を Do / Don't リストとして表示する。 */
export function DoDontList({ kind, children }: { kind: "do" | "dont"; children: ReactNode }) {
  return (
    <div className="flex items-start gap-[var(--spacing-4)] border-b border-outline-dim py-[var(--spacing-4)]">
      <Badge kind={kind} />
      <div className="min-w-0 [&_ul]:list-none [&_ul]:space-y-[var(--spacing-3)] [&_ul]:pl-0">{children}</div>
    </div>
  );
}
