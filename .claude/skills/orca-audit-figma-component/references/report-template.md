# Report template

## 監査結果

最初の1文で、監査が complete か、差分が何件あるか、unresolved が何件あるかを述べる。

```text
Button の45/45 variants × 17 checksを検査しました。監査は complete、差分はN件、unresolvedは0件です。
```

## 対象と完全性

```text
Figma: <URL> / <fileKey>#<component nodeId>
取得時刻: <capturedAt>
fingerprint: sha256:<...>
軸: Type 3 × Size 3 × State 5
inventory: 45 / expected 45
coverage: <variant数> × <required check数> × 3 source pairs、duplicate 0、missing 0
```

`requireCartesianProduct=false` なら expected を断定せず、Figma に存在する variant 数と欠けた直積候補を分ける。

## 判断が必要な差分

severity の高い順にまとめる。

| 対象 variants | property | Figma | design-language | 実装 | status / confidence |
|---|---|---|---|---|---|
| ... | ... | 値 + nodeId | 値 + path:line | 値 + path:line | ... |

表の直後に、更新候補と「どれを正にするか」の判断点を短く書く。自動で裁定しない。

同一原因が45 variantsに波及する場合は finding を1行にまとめ、対象 key の数と範囲を示す。nodeId 一覧は折りたたまず、必要なら別の短い一覧または artifact path で渡す。

## Source gaps / unresolved

- missing document、実装、Storybook、test
- token alias や mode の取得失敗
- Figma では同時状態を表現できないなど、比較不能の理由
- 次に必要な入力または確認

0件なら `なし` と明記する。

## 一致した主要契約

差分だけでは誤解を生む場合に、variant mapping、全組み合わせ、主要 size/state など確認済みの一致を短く示す。

## Artifact

永続化を求められた場合だけ、`inventory.json`、`postflight-inventory.json`、`audit.json`、validator output、Markdown report のパスを示す。ユーザーの許可なく Figma や実装を更新しない。
