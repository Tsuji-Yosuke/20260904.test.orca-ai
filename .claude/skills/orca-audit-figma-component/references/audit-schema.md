# Audit JSON contract

監査 artifact は UTF-8 JSON で保存する。配列順に意味を持たせず、variant key と finding ID で識別する。

## Canonical variant key

variant properties の軸名を Unicode code point 順に並べ、`Axis=Value` を `|` で結ぶ。

```text
Size=Small|State=Enabled|Type=Primary
```

軸名または値に `\\`、`|`、`=` が含まれる場合は、その文字の前に `\\` を付ける。validator も同じ規則で key を再生成する。

## inventory.json

```json
{
  "schemaVersion": 1,
  "component": {
    "name": "Button",
    "fileKey": "figma-file-key",
    "nodeId": "1186:1331",
    "sourceUrl": "https://www.figma.com/design/...",
    "capturedAt": "2026-08-04T12:00:00+09:00"
  },
  "variantAxes": {
    "Type": ["Primary", "Secondary", "Ghost"],
    "Size": ["Small", "Medium", "Large"],
    "State": ["Enabled", "Hover", "Active", "Focused", "Disabled"]
  },
  "requireCartesianProduct": true,
  "componentOptions": {
    "Show Leading Icon": {"type": "BOOLEAN", "defaultValue": true}
  },
  "capture": {
    "complete": true,
    "truncated": false,
    "inventory": {
      "id": "button-inventory",
      "rawPayload": "<MCPが返したinventory envelopeの完全なJSON文字列>",
      "payloadFingerprint": "sha256:..."
    },
    "parts": [
      {
        "id": "button-variants-01",
        "rawPayload": "<MCPが返したsnapshot envelopeの完全なJSON文字列>",
        "payloadFingerprint": "sha256:..."
      }
    ]
  },
  "requiredChecks": [
    "container.background",
    "container.border",
    "container.radius",
    "container.size",
    "container.spacing",
    "label.typography",
    "label.foreground",
    "icon.size",
    "icon.foreground",
    "interaction.hover-active",
    "interaction.focus",
    "interaction.disabled",
    "interaction.state-distinction",
    "interaction.motion",
    "component.options",
    "accessibility.contrast",
    "accessibility.semantics"
  ],
  "requiredComparisons": [
    "figma_vs_design",
    "figma_vs_implementation",
    "design_vs_implementation"
  ],
  "variants": [
    {
      "key": "Size=Small|State=Enabled|Type=Primary",
      "nodeId": "1186:1332",
      "properties": {
        "Type": "Primary",
        "Size": "Small",
        "State": "Enabled"
      },
      "snapshot": {
        "container": {
          "layoutMode": "HORIZONTAL",
          "primaryAxisSizingMode": "AUTO",
          "counterAxisSizingMode": "FIXED",
          "width": 106,
          "height": 40,
          "minWidth": null,
          "maxWidth": null,
          "minHeight": 40,
          "maxHeight": null,
          "paddingTop": 8,
          "paddingRight": 16,
          "paddingBottom": 8,
          "paddingLeft": 16,
          "itemSpacing": 4,
          "cornerRadius": 4,
          "fills": [],
          "strokes": [],
          "strokeWeight": 0,
          "effects": [],
          "opacity": 1
        },
        "label": {
          "present": true,
          "text": "ラベル",
          "fontFamily": "Noto Sans JP",
          "fontStyle": "Regular",
          "fontSize": 12,
          "lineHeight": {"unit": "PIXELS", "value": 12},
          "letterSpacing": {"unit": "PIXELS", "value": 0},
          "fills": []
        },
        "icons": [],
        "componentProperties": {}
      }
    }
  ],
  "variables": {}
}
```

上の `<...>` は説明用placeholderであり、実ファイルでは使用しない。snapshot内の値もschema shapeの説明用で、Buttonの実測値ではない。`rawPayload` には、MCP text contentとして受け取ったJSON文字列を改行・空白を含めてそのまま保存する。

inventory envelopeをdecodeした形は次である。

```json
{
  "schemaVersion": 1,
  "partId": "button-inventory",
  "capturedAt": "2026-08-04T03:00:00.000Z",
  "component": {
    "name": "Button",
    "fileKey": "figma-file-key",
    "nodeId": "1186:1331",
    "componentChildCount": 45
  },
  "variantAxes": {
    "Type": ["Primary", "Secondary", "Ghost"],
    "Size": ["Small", "Medium", "Large"],
    "State": ["Enabled", "Hover", "Active", "Focused", "Disabled"]
  },
  "componentOptions": {
    "Show Leading Icon": {"type": "BOOLEAN", "defaultValue": true}
  },
  "variants": [
    {
      "key": "Size=Small|State=Enabled|Type=Primary",
      "nodeId": "1186:1332",
      "properties": {"Type": "Primary", "Size": "Small", "State": "Enabled"}
    }
  ],
  "returnedCount": 45,
  "endMarker": "FIGMA_AUDIT_COMPLETE:button-inventory:45"
}
```

snapshot envelopeをdecodeした形は次である。`requestedVariantKeys` と `variants[].key` は同じmultisetでなければならない。

```json
{
  "schemaVersion": 1,
  "partId": "button-variants-01",
  "capturedAt": "2026-08-04T03:00:01.000Z",
  "component": {
    "fileKey": "figma-file-key",
    "nodeId": "1186:1331"
  },
  "requestedVariantKeys": ["Size=Small|State=Enabled|Type=Primary"],
  "expectedCount": 1,
  "variants": [
    {
      "key": "Size=Small|State=Enabled|Type=Primary",
      "nodeId": "1186:1332",
      "snapshot": {
        "container": {
          "layoutMode": "HORIZONTAL",
          "primaryAxisSizingMode": "AUTO",
          "counterAxisSizingMode": "FIXED",
          "width": 106,
          "height": 40,
          "minWidth": null,
          "maxWidth": null,
          "minHeight": 40,
          "maxHeight": null,
          "paddingTop": 8,
          "paddingRight": 16,
          "paddingBottom": 8,
          "paddingLeft": 16,
          "itemSpacing": 4,
          "cornerRadius": 4,
          "fills": [],
          "strokes": [],
          "strokeWeight": 0,
          "effects": [],
          "opacity": 1
        },
        "label": {
          "present": true,
          "text": "ラベル",
          "fontFamily": "Noto Sans JP",
          "fontStyle": "Regular",
          "fontSize": 12,
          "lineHeight": {"unit": "PIXELS", "value": 12},
          "letterSpacing": {"unit": "PIXELS", "value": 0},
          "fills": []
        },
        "icons": [],
        "componentProperties": {}
      }
    }
  ],
  "variables": {},
  "returnedCount": 1,
  "endMarker": "FIGMA_AUDIT_COMPLETE:button-variants-01:1"
}
```

`capturedAt`、`sourceUrl`、transport固有のraw payload SHA-256はstate fingerprintから除外される。state fingerprintはcomponent identity、axes、policy、required checks/comparisons、component options、全nodeId/properties/snapshot、variable定義をcanonical JSON化したSHA-256である。したがって別時刻に同じFigma状態を再取得したpreflight/postflightは同じstate fingerprintになる。

validatorは `payloadFingerprint` を信用せず、`rawPayload` のexact bytesからSHA-256を再計算する。さらにraw inventoryとtop-level `variants` のkey/nodeId/properties、raw snapshot partsとtop-level snapshot、raw variablesとtop-level variablesを照合する。raw payloadの`fileKey`とComponent Set nodeIdもtop-level component identityに一致させる。全partの和集合がinventoryの全keyと一致し、重複がなく、件数が一致し、末尾sentinelが存在する場合だけcaptureは完全である。MCP表示に `// truncated to 20kb` が出た、JSON parseに失敗した、sentinelが無い、件数が違う場合はそのpartを採用しない。

各snapshotは上例の`container`、`label`、`icons`、`componentProperties`を必須とする。対象にlabel/iconが無くても省略せず、`label.present=false`または`icons=[]`で明示する。layout mode、sizing mode、width/height、padding、gap、radius、stroke weight、opacityは常在値でありnullにしない。`label.present=true`ならtext、font family/style/size、line-height、letter-spacingを必須にする。line-heightは`{"unit":"PIXELS|PERCENT|AUTO","value":...}`、letter-spacingは`{"unit":"PIXELS|PERCENT","value":...}`で単位を保持し、AUTOのvalueだけnullにする。`present=false`ならtypography値をnullにする。空objectや、全値をnullにしたshellはvalidatorが拒否する。

Paintは次の要素schemaで正規化する。公式Plugin APIの`SOLID`、4種の`GRADIENT_*`、`IMAGE`、`VIDEO`、`PATTERN`、`SHADER`以外は受け付けない。すべてのtypeで`data.blendMode`と、空でない`resolved`を必須にする。`SOLID`だけは`rgba`を必須とし、それ以外では`rgba`とtop-level `variableId`をnullにする。gradient stopのvariable bindingは各stopの`variableId`へ保存する。

```json
{
  "type": "SOLID",
  "visible": true,
  "opacity": 1,
  "rgba": {"r": 0, "g": 0, "b": 0, "a": 1},
  "variableId": "VariableID:123:456",
  "resolved": "#000000",
  "data": {"blendMode": "NORMAL"}
}
```

type別の`data`必須値は次のとおり。Plugin APIのoptional値も、未設定時のdefaultまたはnullへ正規化してfieldを残す。

| Paint type | `data`に保持する値 |
| --- | --- |
| `SOLID` | `blendMode` |
| `GRADIENT_*` | `blendMode`, 2x3 `gradientTransform`, 1件以上の`gradientStops[]`。各stopは`position`, RGBA `color`, `variableId` |
| `IMAGE` / `VIDEO` | `blendMode`, `scaleMode`, `imageHash` / `videoHash`, type固有transform, `scalingFactor`, `rotation`, `filters`。visibleなassetはhash必須 |
| `PATTERN` | `blendMode`, `sourceNodeId`, `tileType`, `scalingFactor`, `spacing`, `horizontalAlignment` |
| `SHADER` | `blendMode`, `id`, `properties` |

Effectは次の要素schemaで正規化する。公式Plugin APIの`DROP_SHADOW`、`INNER_SHADOW`、`LAYER_BLUR`、`BACKGROUND_BLUR`、`NOISE`、`TEXTURE`、`GLASS`、`SHADER`以外は受け付けない。該当しないtop-level値はnullにし、type固有値を`data`に置く。

```json
{
  "type": "DROP_SHADOW",
  "visible": true,
  "radius": 0,
  "spread": 2,
  "offset": {"x": 0, "y": 0},
  "color": {"r": 0.922, "g": 0.039, "b": 0.118, "a": 1},
  "variableId": null,
  "data": {
    "blendMode": "NORMAL",
    "showShadowBehindNode": false
  }
}
```

| Effect type | top-level必須値 | `data`に保持する値 |
| --- | --- | --- |
| `DROP_SHADOW` / `INNER_SHADOW` | `radius`, 正規化済み`spread`, `offset`, `color` | `blendMode`。Dropのみ`showShadowBehindNode` |
| `LAYER_BLUR` / `BACKGROUND_BLUR` | `radius` | `blurType`, `startRadius`, `startOffset`, `endOffset`。NORMALでは後3値をnull |
| `NOISE` | `color` | `blendMode`, `noiseSize`, `noiseSizeVector`, `density`, `noiseType`, `secondaryColor`, `opacity` |
| `TEXTURE` | `radius` | `noiseSize`, `noiseSizeVector`, `clipToShape` |
| `GLASS` | `radius` | `lightIntensity`, `lightAngle`, `refraction`, `depth`, `dispersion` |
| `SHADER` | なし | `id`, `properties` |

PaintとEffectのtypeおよびfieldはFigma公式の[Paint API](https://developers.figma.com/docs/plugins/api/Paint/)と[Effect API](https://developers.figma.com/docs/plugins/api/Effect/)を基準にする。

`componentProperties`の各要素は少なくとも`type`と`value`を持つ。

```json
{
  "Show Leading Icon#292:0": {"type": "BOOLEAN", "value": true},
  "Label#341:133": {"type": "TEXT", "value": "ラベル"}
}
```

local SHA-256はtransport truncation、転記漏れ、片側だけの変更を検出するための整合性checkであり、署名ではない。artifact一式を意図的に協調改ざんする攻撃に対する真正性は保証しない。監査ではrootだけがMCPを呼び、raw tool resultをその場で保存することをtrust boundaryとする。

`requireCartesianProduct=false` のとき、validator は欠けた組み合わせを summary に出すが構造エラーにはしない。設計書または実装がその組み合わせを要求するなら、`missing-in-figma` finding として扱う。

`requiredChecks` から Skill 標準の17 checksを削ることはできない。Component固有のcheckは追加できる。`requiredComparisons` は `figma_vs_design`、`figma_vs_implementation`、`design_vs_implementation` の3つで固定し、比較対象を減らしてcomplete扱いにすることを防ぐ。

## audit.json

```json
{
  "schemaVersion": 1,
  "inventoryFingerprint": "sha256:...",
  "postflightInventoryFingerprint": "sha256:...",
  "assignments": [
    {
      "workerId": "variant-batch-1",
      "variantKeys": ["Size=Small|State=Enabled|Type=Primary"],
      "inventoryFingerprint": "sha256:..."
    }
  ],
  "coverage": [
    {
      "variantKey": "Size=Small|State=Enabled|Type=Primary",
      "workerId": "variant-batch-1",
      "checks": {
        "container.background": {
          "figma_vs_design": "not-asserted",
          "figma_vs_implementation": "mismatch",
          "design_vs_implementation": "not-asserted"
        }
      }
    }
  ],
  "findings": [
    {
      "id": "button-primary-enabled-background",
      "variantKeys": ["Size=Small|State=Enabled|Type=Primary"],
      "check": "container.background",
      "comparison": "figma_vs_implementation",
      "property": "container.fill.base",
      "status": "mismatch",
      "kind": "value-mismatch",
      "severity": "high",
      "confidence": "high",
      "summary": "Figma と実装の base background token が異なる",
      "evidence": [
        {
          "source": "figma",
          "locator": "figma-file-key#1186:1332",
          "kind": "observed",
          "value": {"variable": "Brand/Primary", "resolved": "#000000"}
        },
        {
          "source": "implementation",
          "locator": "packages/react/src/ui/button.tsx:20",
          "kind": "observed",
          "value": "bg-primary"
        }
      ],
      "decisionRequired": true,
      "updateCandidates": ["Figma node 1186:1332", "packages/react/src/ui/button.tsx"]
    }
  ],
  "unresolved": []
}
```

`postflightInventoryFingerprint` は比較完了後にStep 1と同じfull raw captureを再実行し、別ファイル`postflight-inventory.json`として保存したstate fingerprintにする。preflightのコピーは不可。validatorはpostflightのraw captureを再検証し、postflight開始時刻がpreflight完了時刻より後であること、raw capture fingerprintが異なること、state fingerprintが同じことを確認する。各assignmentのfingerprintはworkerに渡したpreflight snapshotと一致させる。

```bash
python3 .agents/skills/orca-audit-figma-component/scripts/validate_audit.py \
  inventory.json audit.json \
  --postflight-inventory postflight-inventory.json --pretty
```

## Enum

Coverage comparison status:

```text
match
mismatch
not-asserted
source-absent
not-representable
unresolved
not-applicable
```

Finding は `match` と `not-applicable` を持たない。coverage の非 `match` / 非 `not-applicable` セルごとに、同じ `variantKey`、`check`、`comparison`、`status` の finding が最低1件必要である。

```text
kind: value-mismatch | missing-in-implementation | extra-in-implementation |
      undocumented-in-spec | missing-in-figma | not-representable | unresolved
```

```text
severity:   critical | high | medium | low | info
confidence: high | medium | low
kind:       observed | asserted | inferred
source:     figma | design | implementation | token | storybook | test | other
```

`mismatch` finding には比較pairの両端の evidence が必要である。たとえば `figma_vs_implementation` なら `source=figma` と `source=implementation` を最低1件ずつ付ける。token、Storybook、testは補助証拠にはできるが、比較端点の代用にはならない。source-absent/not-asserted/unresolved は存在側、文書の非主張、取得失敗の evidence 1件以上でよい。

## Validator output

`valid` は JSON 契約が成立したこと、`complete` は全 inventory と required check/source pair が一意に coverage され unresolved が無いこと、`conformant` は `mismatch` / `source-absent` が無いことを表す。`not-asserted` と `not-representable` は報告対象だが、それだけでは不適合にしない。

- 差分あり・監査完了: `valid=true, complete=true, conformant=false`
- 差分なし・監査完了: `valid=true, complete=true, conformant=true`
- 未検査または取得不能: `complete=false`

終了コード 0 は `valid=true` かつ `complete=true`。差分の有無は終了コードに影響しない。終了コード 1 は schema/coverage/unresolved エラー、2 は入出力エラーである。
