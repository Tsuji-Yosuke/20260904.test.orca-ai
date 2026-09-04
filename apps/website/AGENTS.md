<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 静的出力の比較

ビルド基盤の変更（フレームワーク、MDX、CSS パイプライン）では、変更前後の静的 HTML を比較して振る舞いが変わっていないことを確認する。

```bash
pnpm turbo run build --filter @orca/website
node scripts/normalize-static-html.mjs out /tmp/website-before   # 変更前（main）で取る
node scripts/normalize-static-html.mjs out /tmp/website-after    # 変更後で取る
diff -r /tmp/website-before /tmp/website-after
```

`normalize-static-html.mjs` は script / stylesheet / noscript などフレームワーク由来の要素を落とし、`x.html` と `x/index.html` を同じ URL として扱う。差分が出た場合は、意図した変更かどうかを PR に明記する。
