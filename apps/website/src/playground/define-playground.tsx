"use client";

// PROP_SCHEMAS からの自動導出 + 手書きオーバーレイで PlaygroundConfig を組み立てる。
// 手書きが必要なのは「型から分からないもの」だけ: 継承由来の prop、ReactNode の実値
// （アイコン写像）、日本語ラベル、表示順、compound の render。
import type { ComponentType, ReactNode } from "react";
import { PROP_SCHEMAS } from "@orca/component-meta";
import { deriveControls } from "./derive-controls";
import { createGenericRender, type PropMapper } from "./generic-render";
import type { ControlDef, ControlValues, PlaygroundConfig } from "./types";

type ControlPatch = Partial<{
  label: string;
  defaultValue: string | boolean;
  options: readonly string[];
}>;

export interface PlaygroundOverrides {
  /** 自動導出から除外する prop（className は常に除外済み）。 */
  exclude?: readonly string[];
  /** 自動導出コントロールの部分上書き（label / defaultValue / options）。 */
  controls?: Record<string, ControlPatch>;
  /** 継承由来の prop・アイコン toggle・children text など、型から導出できないコントロール。 */
  extraControls?: ControlDef[];
  /** パネルの表示順（未指定の prop は末尾に元の順で並ぶ）。 */
  order?: readonly string[];
  /** ライブプレビューに使う実体。 */
  component: ComponentType<Record<string, unknown>>;
  /** JSX 値付き toggle（jsxValue / jsxValues）の実 ReactNode を解決する。 */
  propMappers?: Record<string, PropMapper>;
  /** compound 用の完全手書き render。指定時は汎用 render を使わない。 */
  render?: (values: ControlValues) => ReactNode;
  /** 生成コードの import 行（既定: `import { <DisplayName> } from "@orca/react";`）。 */
  imports?: string[];
}

export function definePlayground(
  name: keyof typeof PROP_SCHEMAS,
  overrides: PlaygroundOverrides,
): PlaygroundConfig {
  const schema = PROP_SCHEMAS[name];

  let controls = deriveControls(schema, overrides.exclude ?? []).map((control) => {
    const patch = overrides.controls?.[control.prop];
    return patch ? ({ ...control, ...patch } as ControlDef) : control;
  });
  controls = [...controls, ...(overrides.extraControls ?? [])];

  if (overrides.order) {
    const rank = new Map(overrides.order.map((prop, index) => [prop, index]));
    controls = [...controls].sort(
      (a, b) => (rank.get(a.prop) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.prop) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return {
    component: schema.displayName,
    imports: overrides.imports ?? [`import { ${schema.displayName} } from "@orca/react";`],
    controls,
    render:
      overrides.render ??
      createGenericRender(overrides.component, controls, overrides.propMappers ?? {}),
  };
}
