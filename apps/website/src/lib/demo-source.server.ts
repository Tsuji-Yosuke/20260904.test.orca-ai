// デモの実ファイルをソース文字列として読む（shadcn docs 方式:
// ライブ描画とコード表示が同一ファイルなので乖離しない）。サーバ専用。
import { readWebsiteFile } from "./repo-files.server";

/** src/demos からの相対パスでデモファイルの raw source を返す。 */
export function demoSource(file: string): string {
  return readWebsiteFile(`src/demos/${file}`);
}
