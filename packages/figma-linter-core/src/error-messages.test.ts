import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, formatErrorMessage } from "./error-messages";

/**
 * エラー文の SSoT (docs/detection-rules.md の「エラー文」表) と、コード側カタログ
 * (error-messages.ts) の整合検査。rules.test.ts と同じ方式で、ドキュメントの表を
 * パースして突き合わせる (片方だけ変更するとここで失敗する)。
 */

function readDoc(): string {
  const mdPath = fileURLToPath(new URL("../docs/detection-rules.md", import.meta.url));
  return readFileSync(mdPath, "utf8");
}

function stripBackticks(s: string): string {
  return s.replace(/`/g, "").trim();
}

/** マーカーで挟まれた 2 列テーブルを {左列: 右列} にパースする。 */
function parseTwoColumnTable(md: string, marker: string): Record<string, string> {
  const start = md.indexOf(`<!-- ${marker}:start -->`);
  const end = md.indexOf(`<!-- ${marker}:end -->`);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`docs/detection-rules.md に ${marker} のマーカーが見つかりません。`);
  }
  const out: Record<string, string> = {};
  for (const line of md.slice(start, end).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 2) continue;
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue; // 区切り行
    const key = stripBackticks(cells[0]!);
    if (key === "種別キー") continue; // ヘッダ行
    out[key] = cells[1]!;
  }
  return out;
}

describe("SSoT (detection-rules.md エラー文表) ↔ error-messages.ts カタログ", () => {
  it("エラー文表とカタログが完全一致する", () => {
    const doc = parseTwoColumnTable(readDoc(), "error-messages");
    expect(doc).toEqual({ ...ERROR_MESSAGES });
  });

});

describe("formatErrorMessage", () => {
  it("プレースホルダを実名で埋める", () => {
    expect(formatErrorMessage("dimension.raw", { ルール: "Height" })).toBe(
      "Heightにトークン未使用",
    );
    expect(
      formatErrorMessage("dimension.wrongCategory", { ルール: "Padding Left", カテゴリ: "Margin" }),
    ).toBe("Padding LeftにMarginトークンを指定");
  });

  it("未指定のプレースホルダはそのまま残す (埋め忘れが見えるように)", () => {
    expect(formatErrorMessage("consistency.mismatch")).toBe("{プロパティ}が他バリアントと不揃い");
  });
});
