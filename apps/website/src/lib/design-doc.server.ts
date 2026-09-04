// design-language 原典をファイルから読んでパースする。サーバ専用（fs を使う）。
import { parseDesignDoc, type DesignDoc } from "./design-doc";
import { readRepoFile } from "./repo-files.server";

/** リポジトリルート相対パスの原典を読み、typed model にする。 */
export function loadDesignDoc(designDoc: string): DesignDoc {
  return parseDesignDoc(readRepoFile(designDoc));
}
