// Let TypeScript accept side-effect CSS imports (handled by esbuild at build time).
declare module '*.css';

// ビルド時に scripts/build.mjs の esbuild define が差し込む定数 (bare identifier で参照する)。
// CI(main) ではリリース buildNumber / sha / package.json version、ローカル / dev は 'dev' / 'local' / '0.0.0'。
declare const __BUILD_NUMBER__: string;
declare const __BUILD_SHA__: string;
declare const __BUILD_VERSION__: string;
