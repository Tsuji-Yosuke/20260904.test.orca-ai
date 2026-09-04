import { USAGE_DEMOS } from "@/demos";
import type { UsageSource } from "@/lib/usage-demo.server";
import { CodeBlock } from "./code-block";
import { DemoCanvas } from "./demo-canvas";

/** Usage セクションのライブデモ + コード表示。デモ未整備のコンポーネントはプレースホルダ。 */
export function UsageDemoBlock({ name, source }: { name: string; source?: UsageSource }) {
  const demo = USAGE_DEMOS[name];
  if (!demo || !source) {
    return (
      <p className="rounded-md border-sm border-outline-dim bg-surface-container p-padding-lg typography-standard-body-small text-on-surface-dim">
        ライブデモは準備中。
      </p>
    );
  }
  const Demo = demo.component;
  return (
    <div>
      <DemoCanvas>
        <Demo />
      </DemoCanvas>
      <CodeBlock code={source.code} html={source.html} />
    </div>
  );
}
