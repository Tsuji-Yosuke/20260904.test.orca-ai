/**
 * REST 疎通スパイク: 実ファイルを取得し、REST アダプタが依存するフィールドの
 * 「存在状況レポート」を出力する。lint 本実装の前提 (rest-adapter.ts の写像) が
 * 実データで成立しているかを確認するための読み取り専用スクリプト。
 *
 * 使い方:
 *   FIGMA_TOKEN=... pnpm --filter @orca/figma-linter-ci spike
 *
 * 出力は構造情報 (フィールド名・件数・コレクション名) のみで、デザインの実値
 * (色・寸法・テキスト) は含めない。生 JSON はどこにも保存しない。
 */

import { COMMON_UI_KIT_FILE_KEY } from "./config";
import { fetchFile, fetchLocalVariables } from "./figma-api";
import { isRestAlias, type RestNodeJson } from "./rest-types";

async function main(): Promise<void> {
  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    console.error("FIGMA_TOKEN が設定されていません。");
    process.exit(1);
  }
  const fileKey = process.env.FIGMA_FILE_KEY || COMMON_UI_KIT_FILE_KEY;

  const fileStart = Date.now();
  const file = await fetchFile(fileKey, token);
  const fileMs = Date.now() - fileStart;
  const varsStart = Date.now();
  const variables = await fetchLocalVariables(fileKey, token);
  const varsMs = Date.now() - varsStart;

  // --- ノード走査で adapter が読むフィールドの存在状況を数える ---
  const typeCounts = new Map<string, number>();
  const fieldPresence = new Map<string, number>();
  const boundVarKeys = new Map<string, number>();
  let nodes = 0;
  let radiusUniform = 0;
  let radiusPerCorner = 0;
  let explicitModes = 0;
  let paintBound = 0;
  let paintRawAlpha = 0;
  let setsWithDefs = 0;
  let sets = 0;

  const FIELDS = [
    "layoutMode",
    "layoutWrap",
    "itemSpacing",
    "counterAxisSpacing",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "primaryAxisSizingMode",
    "counterAxisSizingMode",
    "cornerRadius",
    "rectangleCornerRadii",
    "absoluteBoundingBox",
    "characters",
    "componentProperties",
  ] as const;

  const visit = (node: RestNodeJson): void => {
    nodes++;
    typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
    for (const f of FIELDS) {
      if ((node as unknown as Record<string, unknown>)[f] !== undefined) {
        fieldPresence.set(f, (fieldPresence.get(f) ?? 0) + 1);
      }
    }
    if (node.cornerRadius !== undefined) radiusUniform++;
    if (node.rectangleCornerRadii !== undefined) radiusPerCorner++;
    if (node.explicitVariableModes && Object.keys(node.explicitVariableModes).length > 0) {
      explicitModes++;
    }
    for (const key of Object.keys(node.boundVariables ?? {})) {
      boundVarKeys.set(key, (boundVarKeys.get(key) ?? 0) + 1);
    }
    for (const paint of node.fills ?? []) {
      if (paint.boundVariables?.color) paintBound++;
      else if (paint.type === "SOLID" && paint.color && (paint.color.a ?? 1) < 1) paintRawAlpha++;
    }
    if (node.type === "COMPONENT_SET") {
      sets++;
      if (node.componentPropertyDefinitions) setsWithDefs++;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(file.document);

  // --- Variables 側 ---
  const collections = Object.values(variables.meta.variableCollections);
  const vars = Object.values(variables.meta.variables);
  let aliasValues = 0;
  let rawValues = 0;
  for (const v of vars) {
    for (const value of Object.values(v.valuesByMode)) {
      if (isRestAlias(value)) aliasValues++;
      else rawValues++;
    }
  }

  const lines: string[] = [];
  lines.push(`# REST 疎通スパイク結果 — ${file.name}`);
  lines.push("");
  lines.push(`- GET /v1/files: ${fileMs}ms / GET variables/local: ${varsMs}ms`);
  lines.push(`- ノード総数: ${nodes}`);
  lines.push("");
  lines.push(`## ノード種別`);
  for (const [type, count] of [...typeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${type}: ${count}`);
  }
  lines.push("");
  lines.push(`## アダプタが読むフィールドの出現数 (省略時は既定値補完される)`);
  for (const f of FIELDS) {
    lines.push(`- ${f}: ${fieldPresence.get(f) ?? 0}`);
  }
  lines.push("");
  lines.push(`## radius 表現: cornerRadius(単一)=${radiusUniform} / rectangleCornerRadii(四隅)=${radiusPerCorner}`);
  lines.push(`## explicitVariableModes を持つノード: ${explicitModes}`);
  lines.push(`## COMPONENT_SET: ${sets} (componentPropertyDefinitions あり: ${setsWithDefs})`);
  lines.push(`## paint: 変数バインド=${paintBound} / 生値で半透明 (color.a<1)=${paintRawAlpha}`);
  lines.push("");
  lines.push(`## boundVariables のキー出現数 (アダプタ契約の突合に使う)`);
  for (const [key, count] of [...boundVarKeys.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push("");
  lines.push(`## Variable Collections (${collections.length})`);
  for (const c of collections) {
    lines.push(
      `- ${c.name}: 変数 ${c.variableIds.length} / モード [${c.modes.map((m) => m.name).join(", ")}] / defaultModeId=${c.defaultModeId}${c.remote ? " (remote)" : ""}`,
    );
  }
  lines.push(`- 変数値: エイリアス ${aliasValues} / 生値 ${rawValues}`);
  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
