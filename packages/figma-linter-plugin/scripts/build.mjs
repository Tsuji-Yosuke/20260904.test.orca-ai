import * as esbuild from 'esbuild';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const isWatch = process.argv.includes('--watch');
const isDev = isWatch || process.argv.includes('--dev');

/**
 * manifest.json の name / id にビルド番号を焼き込む。CI (figma-linter-plugin-release.yml) が BUILD_NUMBER を渡したビルドだけ
 * name を `Common UI Plugin (build 123)`、id を `...-build.123` に加工し、Figma 上でどのビルドを
 * 読み込んでいるか・どの id かを判別できるようにする。
 * ローカル / dev ビルド (BUILD_NUMBER 無し or 'dev') は素の値に戻すので git diff が汚れない。
 * 既存のビルド接尾辞は一度剥がしてから付け直すため、続けてビルドしても二重に付かない。
 * JSON.parse/stringify は使わず該当行だけ正規表現で差し替え、元ファイルの整形 (インライン配列など) を保つ。
 */
function stampManifestBuildNumber() {
  const path = 'manifest.json';
  const buildNumber = process.env.BUILD_NUMBER;
  const isRelease = Boolean(buildNumber) && buildNumber !== 'dev';

  const raw = readFileSync(path, 'utf8');
  const stamped = raw
    .replace(/("name":\s*")([^"]*)(")/, (_m, pre, value, post) => {
      const base = value.replace(/ \(build [^)]+\)$/, '');
      return `${pre}${isRelease ? `${base} (build ${buildNumber})` : base}${post}`;
    })
    .replace(/("id":\s*")([^"]*)(")/, (_m, pre, value, post) => {
      const base = value.replace(/-build\.[^"]+$/, '');
      return `${pre}${isRelease ? `${base}-build.${buildNumber}` : base}${post}`;
    });
  writeFileSync(path, stamped);
  console.log(`✓ ${path}${isRelease ? ` (build ${buildNumber})` : ''}`);
}

/** Logs a build result line for a context that writes to disk itself. */
function logPlugin(label) {
  return {
    name: 'log',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) console.log(`✓ ${label}`);
      });
    },
  };
}

/**
 * Figma needs the UI as a single self-contained HTML file (it is exposed to the
 * main thread as the `__html__` global). This plugin keeps the UI bundle in
 * memory and inlines the JS (and any CSS) into the HTML template on every build.
 */
function inlineHtmlPlugin({ template, outFile }) {
  return {
    name: 'inline-html',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length > 0) return;
        let js = '';
        let css = '';
        for (const file of result.outputFiles ?? []) {
          if (file.path.endsWith('.css')) css += file.text;
          else if (file.path.endsWith('.js')) js += file.text;
        }
        // 置換は必ず「関数」で行う。文字列置換だと replacement 内の $`, $', $&, $$ などが
        // 特殊解釈され、ミニファイ済み JS/CSS にその並びが現れると HTML 断片が JS に差し込まれて
        // 壊れる ("Unexpected token '<'")。関数の戻り値はそのまま使われるので安全。
        const html = readFileSync(template, 'utf8')
          .replace('</head>', () => `${css ? `  <style>${css}</style>\n` : ''}</head>`)
          .replace('</body>', () => `  <script>${js}</script>\n</body>`);
        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, html);
        console.log(`✓ ${outFile}`);
      });
    },
  };
}

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  target: 'es2017',
  jsx: 'automatic',
  minify: !isDev,
  sourcemap: isDev ? 'inline' : false,
  define: {
    'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
    // CI (figma-linter-plugin-release.yml) が main ビルドで渡すビルド識別子。ローカル / dev ビルドはフォールバック値が
    // 焼かれ、updateCheck が __BUILD_NUMBER__ を数値化できず ('dev'→NaN) 更新チェックを自動スキップする。
    // 必ず bare identifier として参照すること (esbuild の define は obj.__BUILD_NUMBER__ を置換しない)。
    __BUILD_NUMBER__: JSON.stringify(process.env.BUILD_NUMBER ?? 'dev'),
    __BUILD_SHA__: JSON.stringify(process.env.BUILD_SHA ?? 'local'),
    __BUILD_VERSION__: JSON.stringify(process.env.BUILD_VERSION ?? '0.0.0'),
  },
  logLevel: 'info',
};

// Main thread: runs inside Figma's sandbox (no DOM, no module loader).
const mainCtx = await esbuild.context({
  ...shared,
  entryPoints: ['src/main/code.ts'],
  outfile: 'dist/code.js',
  format: 'iife',
  plugins: [logPlugin('dist/code.js')],
});

// UI: runs in an iframe. Bundle stays in memory and is inlined into dist/ui.html.
const uiCtx = await esbuild.context({
  ...shared,
  entryPoints: ['src/ui/main.tsx'],
  outfile: 'dist/ui.js',
  format: 'iife',
  write: false,
  plugins: [inlineHtmlPlugin({ template: 'src/ui/index.html', outFile: 'dist/ui.html' })],
});

stampManifestBuildNumber();

if (isWatch) {
  await Promise.all([mainCtx.watch(), uiCtx.watch()]);
  console.log('\u{1F440} watching for changes…');
} else {
  await Promise.all([mainCtx.rebuild(), uiCtx.rebuild()]);
  await Promise.all([mainCtx.dispose(), uiCtx.dispose()]);
}
