import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.stories.{ts,tsx}", "src/test"],
      outDir: "dist",
    }),
  ],
  resolve: {
    alias: {
      "@/registry/orca": resolve(__dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        /^@base-ui\/react/,
      ],
      output: {
        // "use client" は registry 配布（src コピー）ではファイルごとに残るが、
        // lib build では Rollup が module 単位の directive を除去する。
        // dist を Next.js App Router から使う利用者（apps/website）のために
        // bundle 先頭へ付け直す。全コンポーネントが client 前提なので一括でよい。
        banner: '"use client";',
      },
      onwarn(warning, warn) {
        // 上記のとおり bundle 先頭へ付け直すため、除去に伴う警告のみ抑止する。
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
