// PROP_SCHEMAS（@orca/component-meta が TS 型から抽出）から ControlDef を自動導出する純関数。
// node / number / other はスキップする — jsxValue やサンプル値が必要で、
// definePlayground のオーバーレイ（extraControls）に委ねる。
import type { ComponentSchema } from "@orca/component-meta";
import type { ControlDef } from "./types";

const ALWAYS_EXCLUDE = new Set(["className"]);

/** prop 名を既定ラベルへ（"leadingIcon" → "Leading Icon"）。 */
export function titleCase(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function deriveControls(schema: ComponentSchema, exclude: readonly string[] = []): ControlDef[] {
  const excluded = new Set([...ALWAYS_EXCLUDE, ...exclude]);
  const controls: ControlDef[] = [];
  for (const prop of schema.props) {
    if (excluded.has(prop.name)) continue;
    switch (prop.kind) {
      case "enum": {
        const options = prop.options ?? [];
        controls.push({
          kind: "select",
          prop: prop.name,
          label: titleCase(prop.name),
          options: [...options],
          defaultValue: String(prop.defaultValue ?? options[0] ?? ""),
        });
        break;
      }
      case "boolean": {
        controls.push({
          kind: "toggle",
          prop: prop.name,
          label: titleCase(prop.name),
          defaultValue: prop.defaultValue === true,
        });
        break;
      }
      case "string": {
        controls.push({
          kind: "text",
          prop: prop.name,
          label: titleCase(prop.name),
          defaultValue: String(prop.defaultValue ?? ""),
        });
        break;
      }
      default:
        break;
    }
  }
  return controls;
}
