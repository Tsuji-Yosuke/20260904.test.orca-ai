---
name: Avatar
status: ready
layer: component
description: ユーザーや対象を画像・イニシャルで表す Avatar と、重なり表示のための AvatarUnit。
sources:
  figma:
    # Avatar（COMPONENT_SET）: Size（Small/Medium/Large）× Type（Image/Text/Icon）の2軸。全 variant が円形・常設2px白ボーダー。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=7566-464
    # Avatar/AvatarUnit（COMPONENT）: 40px 円形 Avatar 5個を -12px 重ねた正式なグループ表示コンポーネント。
    - https://www.figma.com/design/dhuY0Fs1irfTaxTRbTCd1h/%F0%9F%A7%B0-Common-UI-Kit--Web-?node-id=9005-9563
  implementations: []
  storybook: []
---

# Avatar

## Guide

### Purpose

- 人物・組織などの主体（エンティティ）を、その画像で小さく代表して示す表示要素。
- 「これは誰／どの主体か」を一目で伝え、画像が無い・読み込み中・失敗のときも破綻せず代替表示で主体を示す責務を負う。
- 画像の取得・トリミング・アップロード、プレゼンス（オンライン状態）のロジックは責務外。
- それ自体は操作要素ではない。クリック可能にしたい場合は外側の操作要素（Button / Link）で包む。
- 本文書は単体の **Avatar** に加え、複数 Avatar を重ねて 1 つの主体グループを表す **AvatarUnit**（Figma 上の正式なグループ表示コンポーネント）も扱う。

### Usage

**Use when**

- リスト・ヘッダー・コメント・メニューなどで主体の同一性をコンパクトに示すとき。
- 名前ラベルの隣に視覚的なアンカーとして主体を添えるとき。
- 画像が無いユーザーにも一貫した代替表示（イニシャル / 汎用アイコン）を出したいとき。

**Do not use when**

- 単なる装飾画像・サムネイル（画像表示の責務は別。Avatar は「主体の代表」に限る）。
- 主体に紐づかない一般的なアイコン表示（Icon を使う）。
- それ自体を主たる操作トリガーにしたいとき（Button / IconButton で包む）。

### User Mental Model

- 「小さな丸い絵が、ひとりの主体を表している」と認識する。円形は Avatar の唯一の形であり、角丸矩形など他の形は想起しない。
- 画像が無くても、イニシャルや人型アイコンで「誰かがいる」ことは伝わると期待する。
- 複数の丸が少しずつ重なって並んでいれば、「複数の主体からなる 1 つのグループ」（AvatarUnit）として読み取る。

### Anatomy

#### Avatar

- **Container**（必須）— 1:1 の正方比の円形の枠。
- **Image**（任意）— 主体の画像。Container を満たすように切り取って表示する。
- **Fallback**（必須）— 画像が無い / 読み込み中 / 失敗のときに表示する代替。イニシャル文字、または汎用の人型アイコン。
- **Border**（必須）— Container の外周を縁取る、常設の白いボーダー。背景から Avatar を切り離す境界を作る。

順序: Image を最前面に、その下に Fallback。Image が表示可能なら Image、そうでなければ Fallback を見せる。Border は最外周を常に囲む。

禁止:

- Container 内に複数の主たる表現（複数画像）を同時に並べない。
- テキストラベル（氏名そのもの）を Container 内に置かない。氏名は隣接要素の責務。

#### AvatarUnit

- 複数の Avatar を横一列に、後続の Avatar が先行の Avatar に一部重なるように並べたグループ表示。
- 各 Avatar は自身の Border（常設の白いボーダー）を保ったまま重なる。重なり量は Border が隣の Avatar との境界を視覚的に保てる範囲にとどめる。
- 表示順序: 先頭の Avatar が最前面か最背面かは Figma 上のレイヤー順に従う（実装着手時に確定。Open Questions 参照）。

禁止:

- Avatar 同士を重ねる際、後ろの Avatar の Border が完全に隠れるほど深く重ねない（境界が失われ 1 つの主体に見えてしまうため）。

### Content Model

- Image の代替テキストは主体の名前を表す（アクセシブルネームの源）。
- Fallback のイニシャルは主体名から導いた 1〜2 文字を基本とする。文章にしない。
- Fallback のアイコンは主体の種類を汚さない汎用表現（人型など）に限る。
- 国際化: 名前・イニシャルの語順や文字種に依存しない（CJK の 1 文字イニシャルも許容）。
- AvatarUnit が表す「表示数」と「実際のメンバー数」の関係（例: 5 件超のときに「+N」のような残数表示を持つか）は Figma に根拠が無く、Open Questions とする。

### Layout And Density

- Container は 1:1 正方比を保つ。中身（画像）は contain ではなく cover 相当で枠を満たす。
- 密度は **Small / Medium / Large**（Medium 既定）。各サイズの実寸は token で定義する（角丸は全サイズ共通で完全な円）。
- AvatarUnit は Avatar を横方向に負のマージンで重ねて配置する。重なり量は 1 段階（Figma 実測: 40px Avatar 同士で -12px）。

### Accessibility Notes

- Avatar が主体名を伝える唯一の手段である場合、画像の代替テキスト（またはそれに準ずる名前）で主体名を支援技術に届ける。
- 主体名が隣接テキストで既に提供され、Avatar が視覚的補助に過ぎない場合は、装飾として支援技術から隠してよい（重複読み上げを避ける）。
- Fallback がイニシャル文字でも、アクセシブルネームは主体名（イニシャルの元）であることを優先する。
- 非インタラクティブなため role は持たせない（操作可能にする場合は外側要素が担う）。
- AvatarUnit はグループとして 1 つの意味単位（例: 「参加者一覧」）を持つことが多い。個々の Avatar の名前を読み上げるか、グループとしての要約（例: 「3 名」）を優先するかは呼び出し側の文脈に委ねる（Open Questions）。

## Spec

### Interaction Model

- Avatar 自体は非インタラクティブ。hover / active / focused の独自状態を持たない。
- 操作が必要な場合は外側の操作要素に委ね、その要素がフォーカス・状態・アクセシブルネームを担う。

### State Model

- 表示は「画像の読み込み状態」軸で切り替わる: **読み込み前 / 成功 / 失敗**。成功時のみ Image、それ以外は Fallback。
- 5 state 共通語彙（enabled/hover/active/focused/disabled）は **適用外**（非インタラクティブのため）。これは Foundations からの逸脱として明示する。

### Visual Semantics

- 形状は円のみ。角丸矩形など他の形状は持たない（形状による主体種別の描き分けは行わない）。
- Container の外周には常設の白いボーダーが付く。太さは「境界を示す最小限の縁取り」程度（Figma 実測: 2px）。背景色に関わらず白で固定し、テーマ切替でも変化しない。
- Fallback の背景は中立の面色（UI/SurfaceDim 系。Figma 実測: #dbdbdb 相当のニュートラルグレー）、前景（イニシャル）は Brand/Primary 系の文字色を用いる。汎用アイコンの Fallback も同系統の配色に揃える。（2026-07-14: 実装時点の記述「背景が Brand/Primary、前景が on 色」は Figma 実測と不一致だったため本記述に訂正。訂正の経緯は Open Questions を参照。）
- AvatarUnit では、各 Avatar 自身の白いボーダーが、重なり合う Avatar 同士の境界を作る（専用の区切り線は持たない）。
- 色だけで主体を区別しない（イニシャル / アイコンを併用する）。

### Variants And Options

- **size**: Small / Medium / Large。意味は密度のみで、主体の重要度を表さない。
- **type**（表示内容）: Image / Text（イニシャル）/ Icon（汎用アイコン、中身は instance-swap で差し替え可能なプレースホルダ）。同じ役割を実装では `fallback` prop（任意 ReactNode）と `src` の有無で表現する。
- **decorative**: 装飾として支援技術から隠すかどうか（a11y 用途、Figma 上の variant ではなく実装固有）。
- AvatarUnit は Avatar の配列を受け取り、重ね順・重なり量を内部で決定する。個々の Avatar の size / fallback は呼び出し側から渡す。

### Open Questions

- プレゼンス（オンライン状態）やステータスバッジを重ねる公式サポートの要否。
- 角丸矩形など円以外の形状の要望が出た場合、Figma 側に逆提案するかどうか（2026-07-14 時点でユーザー裁定により、円形のみをサポート対象とし、shape variant は削除済み）。
- AvatarUnit の表示数と実メンバー数の関係（残数を「+N」のように表示する公式サポートの要否）。Figma には 5 個固定の見本しかなく、可変長・残数表示の根拠が無い。
- AvatarUnit のレイヤー順序（先頭のメンバーが最前面か最背面か）。
- AvatarUnit 全体としてのアクセシブルネーム（グループ要約）の扱い。
- Icon Type（Fallback がアイコンのとき）の具体的なアイコン種別。Figma 上は instance-swap のプレースホルダで中身が未確定。
- 実装着手時に `packages/react/src/ui/avatar.notes.md` へ移送: 採用する実装プリミティブ、画像読み込み状態の扱い、イニシャル導出の責務分担、AvatarUnit の重なり実装（負マージン系 token の選定）。
- **Fallback 配色の訂正（要デザイナー確認）**: 本文書の初版は Visual Semantics に「背景が Brand/Primary、前景が on 色」と記述していたが、実装時に `get_variable_defs` によるトークン突合とスクリーンショット比較で Figma 実測と食い違うことが判明した（実測: 背景は UI/SurfaceDim 系の中立グレー、前景のイニシャルが Brand/Primary）。ルート CLAUDE.md の裁定ルールに従い本来はここでユーザー確認を挟むべきところ、Step2 実装時点では確認を経ずに実測を優先して `bg-surface-dim` / `text-primary` を採用してしまっていた。本文書は実測に合わせて訂正済みだが、これは事後訂正であり、デザイナー／ユーザーによる正式な確認はまだ得ていない。次回のデザインレビューで実測（中立グレー背景 + Brand/Primary 文字色）が意図どおりか確認すること。

### Acceptance Criteria

- AC-Avatar-01: 画像が読み込めるときは Image を、読み込み前 / 失敗のときは Fallback（イニシャル or アイコン）を表示する。
- AC-Avatar-02: 主体名を支援技術に届けられる（または装飾として明示的に隠せる）。
- AC-Avatar-03: 密度 3 段階（Small / Medium / Large）を区別できる。（検証: Storybook）
- AC-Avatar-04: 形状は常に完全な円形であり、他の形状 variant は存在しない。（検証: Storybook）
- AC-Avatar-05: Container は 1:1 比を保ち、画像は枠を満たす。
- AC-Avatar-06: Container の外周に常設の白いボーダーが表示される。（検証: Storybook）
- AC-Avatar-07: 非インタラクティブであり、操作可能化は外側要素に委ねられる。
- AC-Avatar-08: 色・寸法・ボーダーは token 経由で、全テーマで破綻しない。（検証: Storybook）
- AC-Avatar-09: AvatarUnit は複数の Avatar を、各 Avatar のボーダーが境界として視認できる状態を保ったまま重ねて表示する。（検証: Storybook）
