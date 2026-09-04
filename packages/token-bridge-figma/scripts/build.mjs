import { mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";
import preact from "@preact/preset-vite";

const distDir = resolve("dist");
await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await build({
  configFile: false,
  root: resolve("src/ui"),
  publicDir: false,
  base: "./",
  plugins: [preact()],
  build: {
    outDir: distDir,
    emptyOutDir: false,
    minify: false,
    target: "es2015",
    modulePreload: false,
    rollupOptions: {
      input: resolve("src/ui/index.html"),
      output: {
        entryFileNames: "ui.js",
        chunkFileNames: "ui-[name].js",
        assetFileNames: "ui-[name][extname]"
      }
    }
  }
});

const builtHtmlPath = resolve(distDir, "index.html");
const uiHtmlPath = resolve(distDir, "ui.html");
await rename(builtHtmlPath, uiHtmlPath);

let html = await readFile(uiHtmlPath, "utf8");
const scriptMatch = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (scriptMatch) {
  const scriptSrc = scriptMatch[1].replace(/^\.\//, "").replace(/^\//, "");
  const scriptContents = await readFile(resolve(distDir, scriptSrc), "utf8");
  html = html.replace(scriptMatch[0], `<script>${scriptContents}</script>`);
  await unlink(resolve(distDir, scriptSrc));
}

await writeFile(uiHtmlPath, html, "utf8");

const inlinedUiHtml = await readFile(uiHtmlPath, "utf8");

await build({
  configFile: false,
  publicDir: false,
  define: {
    __UI_HTML__: JSON.stringify(inlinedUiHtml)
  },
  build: {
    outDir: distDir,
    emptyOutDir: false,
    minify: false,
    target: "es2015",
    lib: {
      entry: resolve("src/plugin/code.ts"),
      name: "FigmaVariableSyncPlugin",
      fileName: () => "code.js",
      formats: ["iife"]
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
