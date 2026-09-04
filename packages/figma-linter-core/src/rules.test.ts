import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ANATOMY_NUMBERS,
  PADDING_RULE_IDS,
  RULE_BY_ID,
  RULES,
  type RuleDef,
} from "./rules";

/**
 * 検知ルールの SSoT (docs/detection-rules.md) と、コード側カタログ (rules.ts) の整合検査。
 *
 * ドキュメントの「ルール一覧」表を解析し、RULES と過不足・属性 (ラベル / カテゴリ / アナトミー番号 /
 * 期待バインド / 検査フィールド) が一致することを強制する。片方だけ変更するとここで失敗するので、
 * ドキュメントが実装を統制する関係 (= SSoT) が保たれる。
 */

// --- docs/detection-rules.md のルール表をパースする ---

interface DocRule {
  id: string;
  label: string;
  category: string;
  anatomy: number | null;
  /** dimension なら prefix、color なら slot。 */
  expected: string;
  fields: string[];
}

function stripBackticks(s: string): string {
  return s.replace(/`/g, "").trim();
}

function parseAnatomy(cell: string): number | null {
  const v = stripBackticks(cell);
  if (v === "" || /^[—–-]$/.test(v)) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`アナトミー番号が数値でない: "${cell}"`);
  return n;
}

function parseDocRules(): DocRule[] {
  const mdPath = fileURLToPath(
    new URL("../docs/detection-rules.md", import.meta.url),
  );
  const md = readFileSync(mdPath, "utf8");
  const start = md.indexOf("<!-- rules-table:start -->");
  const end = md.indexOf("<!-- rules-table:end -->");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("docs/detection-rules.md にルール表マーカーが見つかりません。");
  }
  const block = md.slice(start, end);
  const rows: DocRule[] = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 6) continue;
    // ヘッダ行 / 区切り行をスキップ。
    if (cells[0] === "ID") continue;
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    rows.push({
      id: stripBackticks(cells[0]!),
      label: cells[1]!.trim(),
      category: cells[2]!.trim(),
      anatomy: parseAnatomy(cells[3]!),
      expected: stripBackticks(cells[4]!),
      fields: stripBackticks(cells[5]!)
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0),
    });
  }
  return rows;
}

/** RULES の 1 件をドキュメント表現に正規化する (比較用)。 */
function toDocShape(rule: RuleDef): DocRule {
  return {
    id: rule.id,
    label: rule.label,
    category: rule.category,
    anatomy: rule.anatomy,
    expected: rule.category === "dimension" ? rule.prefix : rule.slot,
    fields: [...rule.fields],
  };
}

const docRules = parseDocRules();
const docById = new Map(docRules.map((r) => [r.id, r]));

describe("SSoT (detection-rules.md) ↔ rules.ts カタログ", () => {
  it("ドキュメント表とカタログのルール ID 集合が一致する", () => {
    const docIds = [...docById.keys()].sort();
    const codeIds = RULES.map((r) => r.id).sort();
    expect(docIds).toEqual(codeIds);
  });

  it("各ルールの属性 (ラベル / カテゴリ / アナトミー / 期待バインド / フィールド) が一致する", () => {
    for (const rule of RULES) {
      const doc = docById.get(rule.id);
      expect(doc, `ドキュメントに ${rule.id} が無い`).toBeDefined();
      expect(toDocShape(rule)).toEqual(doc);
    }
  });

  it("ドキュメントに、カタログに無いルールが書かれていない", () => {
    for (const doc of docRules) {
      expect(RULE_BY_ID.has(doc.id), `カタログに無いルールが表にある: ${doc.id}`).toBe(true);
    }
  });
});

describe("カタログ自体の構造的サニティ", () => {
  it("ルール ID は一意", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("アナトミー番号は (null を除き) 一意", () => {
    const nums = RULES.flatMap((r) => (r.anatomy === null ? [] : [r.anatomy]));
    expect(new Set(nums).size).toBe(nums.length);
  });

  it("Dimension ルールは prefix と検査フィールドを持つ", () => {
    for (const rule of RULES) {
      if (rule.category !== "dimension") continue;
      expect(rule.prefix.length, `${rule.id} の prefix が空`).toBeGreaterThan(0);
      expect(rule.fields.length, `${rule.id} のフィールドが空`).toBeGreaterThan(0);
    }
  });

  it("ANATOMY_NUMBERS は anatomy を持つルールだけから導出される", () => {
    const expected = Object.fromEntries(
      RULES.filter((r) => r.anatomy !== null).map((r) => [r.id, r.anatomy]),
    );
    expect(ANATOMY_NUMBERS).toEqual(expected);
    // anatomy=null のルール (Margin (Wrap) 等) は番号を持たない。
    for (const rule of RULES) {
      if (rule.anatomy === null) {
        expect(rule.id in ANATOMY_NUMBERS).toBe(false);
      }
    }
  });

  it("PADDING_RULE_IDS はすべて存在する dimension ルールを指す", () => {
    for (const id of PADDING_RULE_IDS) {
      const rule = RULE_BY_ID.get(id);
      expect(rule, `${id} がカタログに無い`).toBeDefined();
      expect(rule!.category).toBe("dimension");
    }
  });
});
