// apps/website の外（モノレポ内の design-language 原典など）と src 配下のファイルを読む、唯一の fs 境界。
// サーバ専用（ビルド時にのみ実行される。vitest から直接読むため server-only は import しない）。
import { readFileSync } from "node:fs";
import { join } from "node:path";

// apps/website から見たリポジトリルート。designDoc などはルート相対パス。
const REPO_ROOT = join(process.cwd(), "..", "..");

/** リポジトリルート相対パスのファイルを読む（意図的にプロジェクト外を参照するため trace 対象外にする）。 */
export function readRepoFile(relPath: string): string {
  return readFileSync(join(/*turbopackIgnore: true*/ REPO_ROOT, relPath), "utf8");
}

/** apps/website 相対パスのファイルを読む。 */
export function readWebsiteFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf8");
}
