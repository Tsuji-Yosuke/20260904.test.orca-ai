# Figma snapshot workflow

## Tool selection

1. node 付き URL から `fileKey` と `nodeId` を得る。URL の `node-id=1186-1331` は Plugin API では `1186:1331`。
2. `use_figma` が利用可能なら `figma-use` Skill を先に読み、exact node を compact read する。`skillNames: "figma-use"` を必ず渡す。
3. `use_figma` が無い場合は `get_metadata`、`get_variable_defs`、`get_screenshot` を組み合わせる。全 variant の paint/effect が取得できなければ `unresolved` にし、完全監査を宣言しない。
4. `get_context_for_code_connect` と repository mapping は実装候補の特定に使えるが、variant snapshot の代替にはしない。
5. `list_file_components_for_code_connect` は publish/mapping 対象の発見用で、Component Set の全 variant inventory とはみなさない。

Figma MCP の read tool には seat/plan ごとの日次・月次上限と分単位上限があるため、set-level batch と snapshot 再利用を前提にする。公式: <https://developers.figma.com/docs/figma-mcp-server/plans-access-and-permissions/>

Code Connect は実装ファイルと component usage の特定を補強するが、Figma の全 visual property を監査した証拠にはならない。公式: <https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/>

## Read-only constraints

- `figma.getNodeByIdAsync(nodeId)` から開始する。document root の全走査をしない。
- page 切替、node 作成、property 更新、selection 更新をしない。
- top-level `await` と `return` を使い、IIFE や `notify` を使わない。
- set-level compact read を優先し、45 variant に45回の MCP call を行わない。ただしtransportで切れる出力を採用せず、必要なら5〜10 variant程度の決定的batchへ縮小する。
- `getCSSAsync()` に依存しない。MCP runtime で未サポートになることがある。
- error は source failure として記録する。データを推測して埋めない。

## Transport truncation guard

inventory callはComponent Set直下の全variant key/nodeId/propertiesと、実際の `target.children.length` を `component.componentChildCount` に含める。snapshot callはinventoryで固定したkeyを `requestedVariantKeys` に列挙する。

全 `use_figma` 返却は、objectの最後のpropertyとして次のsentinelを含め、`JSON.stringify(payload)` のparse可能な文字列として返す。次はsnapshot envelopeの最小形である。

```js
const capturedAt = new Date().toISOString();
const payload = {
  schemaVersion: 1,
  partId,
  capturedAt,
  component: { fileKey: "FILE_KEY", nodeId: "COMPONENT_SET_NODE_ID" },
  requestedVariantKeys,
  expectedCount: requestedVariantKeys.length,
  variants,
  variables,
  returnedCount: variants.length,
  endMarker: `FIGMA_AUDIT_COMPLETE:${partId}:${variants.length}`,
};
return JSON.stringify(payload);
```

MCPのtext出力にsentinelが無い、`// truncated to 20kb` がある、JSONとして最後までparseできない、requested/returned countが違う場合、その返却は不完全である。同じ大きさで盲目的に再試行せず、inventoryのcanonical keyまたはnode ID昇順で半分に分割する。MCPが返したJSON文字列を変更せず `rawPayload` に保存し、そのexact bytesからSHA-256を計算して `payloadFingerprint` に置く。parse後のsentinel、件数、実keyを別フィールドへ転記して完全性の根拠にしてはならない。

最初に全variantのkey/nodeId/propertiesを返すinventory envelopeを保存し、続けてvisual snapshot partsを保存する。全envelopeにtimezone付き`capturedAt`、URLから得た`fileKey`、Component Set nodeIdを含める。validatorがraw payloadを再parse・再hashし、全partのvariant keyをexactly-onceでmergeできるまで `capture.complete=true` にしない。

## Normalization

Component Set の直下 `COMPONENT` を inventory にする。各 variant で次を正規化する。

```text
properties -> canonical variant key
container  -> layoutMode, primary/counterAxisSizingMode, width/height,
              min/max width/height, padding 4辺, itemSpacing, cornerRadius,
              fills[], strokes[], strokeWeight, effects[], opacity
label      -> present, text, font family/style, size, line-height,
              letter-spacing, fills[]
icons      -> role, present, visible, width, height, fills[], strokes[]
properties -> boolean, text, instance-swap definitions/defaults
```

値が存在しないfieldも削除せず`null`または空配列で明示する。label/icon自体が無いComponentは`label.present=false`、`icons=[]`にする。validatorは必須visual fieldが欠けたsnapshotを拒否する。

Paintは`audit-schema.md`の要素schemaへ正規化し、`type`、visible、opacity、RGBA、bound variable ID、resolved値、blend mode、type固有dataを保持する。Effectもtype、visible、radius、spread、offset、color、bound variable ID、type固有dataを保持する。gradient stop、media transform/filter、pattern、shader、shadow、blur、noise、texture、glassを空objectへ潰さない。文字列色やFigma API objectの丸ごと転記は不可。VariableはIDだけで止めず、name、collection、mode、alias chain、最終値を保持する。

PaintとEffectはFigma公式の[Paint API](https://developers.figma.com/docs/plugins/api/Paint/)と[Effect API](https://developers.figma.com/docs/plugins/api/Effect/)にあるdiscriminated unionをtype別に正規化する。API上optionalな値もdefaultまたはnullとしてfieldを残す。

bound variable は、runtime が対応する場合 `variable.resolveForConsumer(consumerNode)` の値も consumer node ごとに保存する。variable の解決値は node の explicit/inherited mode と alias 先 collection の mode に依存し、複数 mode を静的に1値へ決められない場合がある。mode を仮定しない。公式: <https://developers.figma.com/docs/plugins/api/properties/Variable-resolveforconsumer/>

alias loop、consumer mode 不明、API 非対応、アクセス不能は unresolved。

snapshot 内で参照した `VariableID:*` はすべて top-level `variables` に定義する。validator は欠けた定義、存在しない alias target、alias cycle、mode 無しを不完全な snapshot として拒否する。

複数 paint は配列順を保つ。Primary/Hover の `base fill + 8% state layer` と、単一の置換色は同一視しない。

## Compact extraction outline

実行コードは file/node 固有値だけを差し替え、次の形にする。

```js
const target = await figma.getNodeByIdAsync("NODE_ID");
if (!target || target.type !== "COMPONENT_SET") {
  throw new Error("Target is not a COMPONENT_SET");
}

const fileKey = "FILE_KEY";
const partId = "component-inventory";
const capturedAt = new Date().toISOString();
const variants = target.children
  .filter((node) => node.type === "COMPONENT")
  .map((node) => {
    const properties = node.variantProperties || {};
    return {
      key: canonicalVariantKey(properties),
      nodeId: node.id,
      properties,
    };
  });

const payload = {
  schemaVersion: 1,
  partId,
  capturedAt,
  component: {
    name: target.name,
    fileKey,
    nodeId: target.id,
    componentChildCount: variants.length,
  },
  variantAxes,
  componentOptions,
  variants,
  returnedCount: variants.length,
  endMarker: `FIGMA_AUDIT_COMPLETE:${partId}:${variants.length}`,
};
return JSON.stringify(payload);
```

`canonicalVariantKey`、`variantAxes`、`componentOptions`は`audit-schema.md`の契約どおりに組み立てる。Figmaのcomponent property keyには`Show Icon#292:0`のような内部suffixが付くことがあるため、raw keyを保持し、表示名だけで衝突統合しない。

返却が大きい場合もvariant snapshotをsignatureだけへ集約しない。全variantの必須visual fieldを保ったまま、canonical key昇順の5〜10件batchへ分ける。snapshot間のFigma更新混入は、比較後に同じfull raw captureを`postflight-inventory.json`として取り直し、validatorでstate fingerprintとcapture時刻を照合して検知する。

## Interpretation traps

- HUG container の `width` は default label と visible icon の結果であり、通常は実装の固定幅と比較しない。minHeight、padding、gap、content size を比較する。
- Figma `Focused` は hover/active と別 variant でも、設計書が同時成立を要求する場合がある。実装の `focus-visible` と state-layer の共存を別途確認する。
- icon instance 内の stroke/fill が label と別 token のことがある。label color から推定しない。
- transparent fill と fill 無しは別の観測値として保持する。
- Figma の dark/light mode が同じ alias を指していても、collection と mode を保存する。
- screenshot は視覚的な二次証拠。数値、variable、全 variant coverage の一次証拠にはしない。
