/**
 * エラー文 (違反 1 種のユーザー向け日本語要約) のカタログ (コード側の SSoT)。
 *
 * 人間向けの正本は docs/detection-rules.md の「エラー文」表。両者は
 * src/error-messages.test.ts が照合し、片方だけ変更するとテストが落ちる
 * (rules.ts と同じ統制方式)。
 *
 * 文言はテンプレートで、{ルール} {カテゴリ} {コレクション} {プロパティ} を
 * formatErrorMessage が実際の名前に置換する。違反 → 種別キーへの分類は消費者側が行う
 * (現在は figma-linter-ci の notify.ts。将来プラグインのエラー表示でも共用できる)。
 */

export const ERROR_MESSAGES = {
  "dimension.raw": "{ルール}にトークン未使用",
  "dimension.unresolvable": "{ルール}のトークンが参照できない (ノイズ変数の可能性)",
  "dimension.mixedCorners": "{ルール}の指定が四隅で不揃い",
  "dimension.wrongCategory": "{ルール}に{カテゴリ}トークンを指定",
  "dimension.wrongToken": "{ルール}に誤ったトークンを指定",
  "dimension.wrongCollection": "{ルール}に{コレクション}のトークンを指定",
  "background.overlayRaw": "状態オーバーレイにトークン未使用",
  "background.raw": "Backgroundにトークン未使用",
  "background.unresolvable": "Backgroundのトークンが参照できない (ノイズ変数の可能性)",
  "background.reference": "BackgroundにReferenceカラーを指定",
  "background.on": "BackgroundにOnカラーを指定",
  "background.wrongToken": "Backgroundに誤ったカラートークンを指定",
  "background.wrongCollection": "Backgroundに{コレクション}のカラーを指定",
  "on.raw": "Onカラーにトークン未使用",
  "on.unresolvable": "Onカラーのトークンが参照できない (ノイズ変数の可能性)",
  "on.mixed": "Onカラーの指定が混在",
  "on.reference": "OnカラーにReferenceカラーを指定",
  "on.wrongPair": "背景に対応しないOnカラーを指定",
  "on.nonOn": "OnカラーにOn以外のカラーを指定",
  "on.wrongCollection": "Onカラーに{コレクション}のカラーを指定",
  "consistency.mismatch": "{プロパティ}が他バリアントと不揃い",
} as const satisfies Record<string, string>;

export type ErrorMessageKind = keyof typeof ERROR_MESSAGES;


/** テンプレートのプレースホルダを実名で埋める (未指定のプレースホルダはそのまま残す)。 */
export function formatErrorMessage(
  kind: ErrorMessageKind,
  params: Record<string, string> = {},
): string {
  return ERROR_MESSAGES[kind].replace(/\{([^}]+)\}/g, (raw, key: string) => params[key] ?? raw);
}
