// design-language 原典の Acceptance Criteria（AC ID 契約）を読むための純関数群。
// 規約の正本は packages/design-language/README.md。

export interface AcceptanceCriterion {
  id: string;
  text: string;
  /** （検証: …）の中身。null はユニットテスト必須（テスト名に ID が要る）。 */
  verification: string | null;
}

export interface ComponentContract {
  name: string;
  status: string;
  criteria: AcceptanceCriterion[];
  /** 契約として不正な点（ID 無し AC 行、重複 ID など）。ready 文書では空であるべき。 */
  problems: string[];
}

const AC_ID_PATTERN = /AC-[A-Za-z0-9]+-\d{2}/g;
const AC_LINE_PATTERN = /^- (AC-([A-Za-z0-9]+)-\d{2}): (.+)$/;
const VERIFICATION_PATTERN = /（検証:\s*([^）]+)）/;

function parseFrontmatter(markdown: string): { name: string; status: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  const block = match?.[1] ?? "";
  return {
    name: block.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? "",
    status: block.match(/^status:\s*(.+)$/m)?.[1]?.trim() ?? "",
  };
}

// Acceptance Criteria は ## Spec 配下の ### 見出し（規約: design-language README）。
// 次の見出し（### または ##）まで、無ければ文書末尾までをセクション本文とする。
function acceptanceCriteriaSection(markdown: string): string | null {
  const match = markdown.match(
    /^### Acceptance Criteria\s*$([\s\S]*?)(?=^##+ |(?![\s\S]))/m,
  );
  return match?.[1] ?? null;
}

export function parseComponentDoc(markdown: string): ComponentContract {
  const { name, status } = parseFrontmatter(markdown);
  const criteria: AcceptanceCriterion[] = [];
  const problems: string[] = [];

  const section = acceptanceCriteriaSection(markdown);
  if (section === null) {
    return {
      name,
      status,
      criteria,
      problems: ["Acceptance Criteria セクションが無い"],
    };
  }

  const seen = new Set<string>();
  for (const line of section.split("\n")) {
    if (!line.startsWith("- ")) continue;

    const match = line.match(AC_LINE_PATTERN);
    if (!match) {
      problems.push(`AC ID の無い行: ${line}`);
      continue;
    }
    const [, id, component, body] = match;
    if (!id || !component || !body) continue;

    if (seen.has(id)) {
      problems.push(`重複した AC ID: ${id}`);
      continue;
    }
    seen.add(id);

    if (component !== name) {
      problems.push(`frontmatter の name（${name}）と一致しない AC ID: ${id}`);
      continue;
    }

    const verification = body.match(VERIFICATION_PATTERN)?.[1]?.trim() ?? null;
    criteria.push({
      id,
      text: body.replace(VERIFICATION_PATTERN, "").trim(),
      verification,
    });
  }

  return { name, status, criteria, problems };
}

/** 任意のテキスト（テストソース等）に現れる AC ID を出現順・重複なしで返す。 */
export function collectAcIds(source: string): string[] {
  return [...new Set(source.match(AC_ID_PATTERN) ?? [])];
}
