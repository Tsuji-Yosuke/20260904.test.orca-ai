# Plan 002: GitHub PAT の永続化をオプトイン制にし、保存済みトークンの削除手段を追加する

> **Executor instructions**: このプランをステップ順に実行すること。各ステップの
> 検証コマンドを実行し、期待結果を確認してから次に進む。「STOP conditions」の
> いずれかが発生したら、改善を試みずに停止して報告する。完了したら
> `plans/README.md` の該当行の Status を更新する。
>
> **Drift check (最初に実行)**: `git diff --stat 73dd926..HEAD -- packages/token-bridge-figma/src/plugin/code.ts packages/token-bridge-figma/src/plugin/storage.ts packages/token-bridge-figma/src/ui/components/ConfigScreen.tsx packages/token-bridge-figma/src/shared/messages.ts`
> 差分があるファイルは「Current state」の抜粋と現物を突合し、不一致なら STOP。

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `73dd926`, 2026-07-07

## Why this matters

Figma プラグインの設定保存時、GitHub personal access token（fine-grained PAT）が
**無条件で** `figma.clientStorage` に平文で永続化される。設定型には
`patStorageOptIn` というオプトインフラグが存在するのに、プラグイン側・UI 側の
両方で `true` にハードコードされており、ユーザーが「保存しない」を選ぶ手段も、
保存済みトークンを削除する手段も無い。共有端末や端末侵害時に PAT が露出する。
設定項目が実質機能していない仕様ドリフトでもある。

**注意（Hard Rule）**: このプランのどの成果物にもトークンの実値を書かないこと。
テスト用のダミー値は `"dummy-token"` のような明らかな偽値のみ使用する。

## Current state

- `packages/token-bridge-figma/src/plugin/code.ts:162-167` — `save-config` ハンドラ:
  ```ts
  case "save-config": {
    const nextToken = message.token || runtimeState.token;
    runtimeState.config = { ...normalizePluginConfig(message.config), patStorageOptIn: true };  // ← 強制 true
    runtimeState.token = nextToken.trim();
    writeStoredConfig(runtimeState.config);
    await writeStoredToken(runtimeState.token, true);   // ← 常に persist
  ```
- `packages/token-bridge-figma/src/plugin/storage.ts:60-67` — 削除分岐は実装済みだが
  現状どこからも `persist=false` で呼ばれない（到達不能）:
  ```ts
  export async function writeStoredToken(token: string, persist: boolean): Promise<void> {
    if (!persist) {
      await figma.clientStorage.deleteAsync(TOKEN_KEY);
      return;
    }
    await figma.clientStorage.setAsync(TOKEN_KEY, token);
  }
  ```
- `packages/token-bridge-figma/src/ui/components/ConfigScreen.tsx:20-31` — `handleSave` が
  `patStorageOptIn: true` をハードコード。オプトアウト用の入力 UI が無い。
  フォームは `useRef` + `defaultValue` パターン（owner/repo/baseBranch/targetDir/token）。
- `packages/token-bridge-figma/src/shared/messages.ts` — `PluginRequest` ユニオンに
  トークン削除のリクエスト種別が無い（`save-config` / `refresh-diff` / … / `apply-selected` の10種）。
- `packages/token-bridge-figma/src/ui/state.ts:27-42` — UI 側の初期 config も
  `patStorageOptIn: true`。`hasStoredToken: boolean` が ViewState に既にあり、
  保存済みトークンの有無は UI から分かる。
- `PluginConfig` 型は `packages/token-bridge-figma/src/core/types.ts` にある（要確認だが
  `patStorageOptIn: boolean` フィールドは既存 — 型変更は不要のはず）。

**リポジトリ規約**: コメント・UI 文言は日本語。UI は Preact + `class`（`className`
ではない）。既存の `.field` / `.btn` / `.input` クラスに合わせる。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| テスト | `pnpm --filter @orca/token-bridge-figma test` | 全 pass |
| Typecheck | `pnpm --filter @orca/token-bridge-figma typecheck` | exit 0 |
| Build | `pnpm --filter @orca/token-bridge-figma build` | exit 0 |
| 全体検証 | `pnpm turbo run build typecheck test tokens:check` | 全タスク成功 |

## Scope

**In scope**:
- `packages/token-bridge-figma/src/plugin/code.ts`
- `packages/token-bridge-figma/src/ui/components/ConfigScreen.tsx`
- `packages/token-bridge-figma/src/shared/messages.ts`
- `packages/token-bridge-figma/src/ui/state.ts`（必要なら `hasStoredToken` の更新のみ）
- `packages/token-bridge-figma/tests/config.test.ts`（正規化のテストを足す場合）

**Out of scope**:
- `packages/token-bridge-figma/src/plugin/storage.ts` — 削除分岐は既に正しい。変更不要。
- トークンの暗号化やマスク表示などの追加強化 — 別判断。
- `docs/sync-spec.md` の改訂。

## Git workflow

- ブランチ: `fix/token-bridge-pat-opt-out`（main から分岐）
- コミット例: `fix(token-bridge-figma): honor patStorageOptIn and add stored-token deletion`
- push / PR 作成はオペレーターの指示があるまで行わない。

## Steps

### Step 1: messages.ts にトークン削除リクエストを追加

`PluginRequest` ユニオンに `| { type: "delete-stored-token" }` を追加。

**Verify**: `pnpm --filter @orca/token-bridge-figma typecheck` → この時点では未処理
ハンドラの exhaustiveness エラーが出る可能性がある（switch が網羅型なら）。出た場合は
Step 2 とまとめて green にしてよい。

### Step 2: code.ts を修正

1. `save-config`: `patStorageOptIn` の強制 true をやめ、UI から来た値を尊重する:
   ```ts
   runtimeState.config = normalizePluginConfig(message.config);
   runtimeState.token = nextToken.trim();
   writeStoredConfig(runtimeState.config);
   await writeStoredToken(runtimeState.token, runtimeState.config.patStorageOptIn);
   ```
   `patStorageOptIn === false` のとき `writeStoredToken(_, false)` が保存済みトークンを
   削除する（storage.ts の既存分岐に到達させる）。オフでもセッション中は
   `runtimeState.token` で動作継続する旨を日本語コメントで残す。
2. `delete-stored-token` ハンドラを追加: `await writeStoredToken("", false)` を呼び、
   `postMessage({ type: "state", state: { hasStoredToken: false } })` と
   `postStatus("success", "保存済みトークンを削除しました。")` を返す。
   （`postMessage` / `postStatus` は code.ts 内の既存ヘルパーを使う。）
3. save-config の応答にも `hasStoredToken: runtimeState.config.patStorageOptIn && runtimeState.token.length > 0`
   相当を含め、UI の表示が実態と揃うようにする（既存の save-config 応答 state を確認して追従）。

**Verify**: `pnpm --filter @orca/token-bridge-figma typecheck` → exit 0

### Step 3: ConfigScreen.tsx にオプトアウト UI と削除ボタンを追加

1. checkbox を追加（`useRef<HTMLInputElement>` + `defaultChecked={config.patStorageOptIn}`、
   既存フォームのパターンに合わせる）。ラベル文言例: 「PAT をこの端末に保存する
   （オフにすると毎回入力が必要）」。
2. `handleSave` の `patStorageOptIn: true` を checkbox の値
   （`patRef.current?.checked ?? config.patStorageOptIn`）に置換。
3. `hasStoredToken` が true のときだけ表示される「保存済みトークンを削除」ボタンを追加し、
   `post({ type: "delete-stored-token" })` を送る。

**Verify**: `pnpm --filter @orca/token-bridge-figma typecheck && pnpm --filter @orca/token-bridge-figma build` → exit 0

### Step 4: ハードコードの残存が無いことを確認

**Verify**: `grep -rn "patStorageOptIn: true" packages/token-bridge-figma/src/plugin/code.ts packages/token-bridge-figma/src/ui/components/` → **0 件**
（`ui/state.ts` の初期値のみ許容 — 初期値としてオンはよいが、保存経路の強制が無いこと）

### Step 5: 全体検証

**Verify**: `pnpm turbo run build typecheck test tokens:check` → 全タスク成功

## Test plan

- plugin/code.ts のハンドラは現状ユニットテスト不能（`figma` グローバル依存 —
  監査 finding TEST-02、別プラン領域）。このプランでは型・ビルド検証と grep を
  機械的ゲートとする。
- `tests/config.test.ts` に「`normalizePluginConfig` が `patStorageOptIn` を
  変更しない（入力値を保持する）」テストを1件追加する（正規化で false が true に
  巻き戻らない回帰ガード）。パターンは同ファイルの既存テストに合わせる。
- 手動確認（実施できる環境がある場合のみ・任意）: Figma デスクトップでプラグインを
  開発モード起動し、(a) オプトアウト保存→プラグイン再起動でトークン未復元、
  (b) 削除ボタン→ hasStoredToken 表示が消える、を確認。実施不能なら省略してよい
  （その旨を報告に書く）。

## Done criteria

- [ ] `pnpm --filter @orca/token-bridge-figma test` exit 0（config.test.ts の新規1件含む）
- [ ] `pnpm --filter @orca/token-bridge-figma typecheck` / `build` exit 0
- [ ] Step 4 の grep が 0 件
- [ ] `pnpm turbo run build typecheck test tokens:check` 全タスク成功
- [ ] In scope 外のファイルに変更が無い
- [ ] `plans/README.md` の Status 更新

## STOP conditions

- 「Current state」の抜粋が現物と一致しない。
- `PluginConfig` 型に `patStorageOptIn` が存在しない（前提が崩れている）。
- `save-config` の応答 state の構造が想定と大きく異なり、hasStoredToken の整合を
  取るために messages.ts の応答型を変える必要が生じた（変えずに報告する）。

## Maintenance notes

- 運用上の推奨（PR 説明に含めること）: 使用する PAT は対象 repo に限定した
  fine-grained token とし、定期ローテーションする。過去にこのプラグインを共有端末で
  使った場合、既存トークンのローテーションを推奨。
- 将来 `load-initial-state` 周りを触る際、`hasStoredToken` と `patStorageOptIn` の
  組み合わせ（保存オフだが起動時にトークン入力済み等）の表示整合に注意。
