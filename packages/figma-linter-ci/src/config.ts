/**
 * CI lint の既定設定。環境変数で上書きできるものは cli.ts / spike.ts が読み替える。
 */

/**
 * Common UI Kit 本体ファイルの fileKey。figma-linter-plugin の COMMON_UI_KIT_FILE_KEY と同じ値
 * (プラグインは「本体ファイルかどうか」の表示判定、こちらは検査対象の既定値として使う)。
 */
export const COMMON_UI_KIT_FILE_KEY = "dhuY0Fs1irfTaxTRbTCd1h";

/**
 * 検査から除外する名前プレフィックス (ページ名・コンポーネント/Component Set 名の両方に適用)。
 * Figma の命名規則に合わせ、`_` と `.` 始まりを WIP / 非公開扱いとして除外する。
 */
export const EXCLUDE_NAME_PREFIXES = ["_", "."] as const;

/** 除外対象の名前か (前後空白を無視して prefix 判定)。 */
export function isExcludedName(name: string): boolean {
  const trimmed = name.trim();
  return EXCLUDE_NAME_PREFIXES.some((p) => trimmed.startsWith(p));
}

/** lint レポートの既定パス (このパッケージからの相対)。CI が commit する。 */
export const DEFAULT_REPORT_RELATIVE_PATH = "reports/common-ui-kit.json";

/** PAT の失効事前警告を出す残日数のしきい値。 */
export const TOKEN_EXPIRY_WARN_DAYS = 14;
