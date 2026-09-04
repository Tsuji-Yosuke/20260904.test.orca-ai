import { ANATOMY_SPECS } from "@/demos";
import { DemoCanvas } from "./demo-canvas";

/** Anatomy セクションの解剖図 + 要素テーブル。未整備のコンポーネントは何も出さない。 */
export function AnatomyBlock({ name }: { name: string }) {
  const spec = ANATOMY_SPECS[name];
  if (!spec) return null;
  const Diagram = spec.component;
  return (
    <div>
      <div className="[&>div]:rounded-md [&>div]:border-b-sm">
        <DemoCanvas>
          <Diagram />
        </DemoCanvas>
      </div>
      <table className="mt-margin-2xl w-full border-collapse typography-standard-body-small">
        <thead>
          <tr className="text-left typography-standard-label-medium-bold">
            <th className="w-[var(--spacing-12)] border-b-sm border-outline px-padding-sm py-padding-xs">No.</th>
            <th className="border-b-sm border-outline px-padding-sm py-padding-xs">名称</th>
            <th className="border-b-sm border-outline px-padding-sm py-padding-xs">解説</th>
            <th className="w-[var(--spacing-24)] border-b-sm border-outline px-padding-sm py-padding-xs">オプション</th>
          </tr>
        </thead>
        <tbody>
          {spec.rows.map(({ no, name: rowName, description, optional }) => (
            <tr key={no}>
              <td className="border-b-sm border-outline-dim px-padding-sm py-padding-xs">{no}</td>
              <td className="border-b-sm border-outline-dim px-padding-sm py-padding-xs">{rowName}</td>
              <td className="border-b-sm border-outline-dim px-padding-sm py-padding-xs">{description}</td>
              <td className="border-b-sm border-outline-dim px-padding-sm py-padding-xs">
                {optional ? "✓" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
