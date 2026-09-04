import { CopyButton } from "./copy-button";

/** shiki でハイライト済みの tsx コードブロック（コピー付き）。html は highlightTsx(code) の結果。 */
export function CodeBlock({ code, html }: { code: string; html: string }) {
  return (
    <div className="relative rounded-b-md border-sm border-outline-dim bg-surface-container">
      <div className="absolute right-padding-xs top-padding-xs">
        <CopyButton text={code} />
      </div>
      <div
        className="overflow-x-auto p-padding-lg font-mono text-[13px] leading-relaxed [&_pre]:bg-transparent!"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
