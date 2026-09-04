// 静的ビルド出力の HTML を、フレームワーク由来の差分を除いて比較できる形に正規化する。
//
//   node scripts/normalize-static-html.mjs <buildDir> <outDir>
//
// <buildDir> 配下の *.html を URL パスをキーにした <outDir>/<path>.html へ書き出す。
// 2 つのビルド（例: Next の out/ と React Router の build/client/）をそれぞれ正規化し、
// `diff -r` すれば URL 集合と本文の両方を比較できる。
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const [buildDir, outDir] = process.argv.slice(2);
if (!buildDir || !outDir) {
  console.error("usage: node scripts/normalize-static-html.mjs <buildDir> <outDir>");
  process.exit(1);
}

/** ビルド出力の相対パスを URL パスへ正規化する（x.html と x/index.html を同一視）。 */
function urlPath(file) {
  const path = "/" + file.split("\\").join("/");
  if (path === "/index.html") return "/";
  if (path.endsWith("/index.html")) return path.slice(0, -"/index.html".length);
  return path.replace(/\.html$/, "");
}

/** フレームワークごとに異なる要素を落とし、1 タグ 1 行に整形する。 */
function normalize(html) {
  return (
    html
      // バンドル参照と RSC / loader データ
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/g, "")
      // stylesheet / preload はハッシュ付きなので落とす（icon は残す）
      .replace(/<link\b(?![^>]*\brel="icon")[^>]*>/g, "")
      // Next が自動出力するフレームワーク固有 meta
      .replace(/<meta name="next-size-adjust"[^>]*>/g, "")
      .replace(/>\s*</g, ">\n<")
      .trim() + "\n"
  );
}

const files = readdirSync(buildDir, { recursive: true, encoding: "utf8" }).filter((file) =>
  file.endsWith(".html"),
);
for (const file of files) {
  const url = urlPath(file);
  const target = join(outDir, url === "/" ? "index.html" : `${url}.html`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, normalize(readFileSync(join(buildDir, file), "utf8")));
}
console.log(`${files.length} pages -> ${relative(process.cwd(), outDir) || "."}`);
