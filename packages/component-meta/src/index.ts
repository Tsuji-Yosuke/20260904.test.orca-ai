// @orca/component-meta の公開 API。
// items.ts: 手書きカタログ（UI_ITEMS / LIB_ITEMS）
// generated/prop-schemas.ts: TS 型から抽出した props スキーマ（meta:extract で生成）
// 抽出スクリプトは items.ts を直接 import するため、生成物が壊れていても再生成できる。
export { UI_ITEMS, LIB_ITEMS, type ItemMeta } from "./items";
export { PROP_SCHEMAS } from "./generated/prop-schemas";
export type { ComponentSchema, PropKind, PropSchema } from "./extract/schema-types";
