import type {
  CheckSection,
  ComponentSummary,
  ConsistencyReport,
  FixDiff,
  InspectionResult,
  PresetSummary,
  RefOption,
  SwapperGroup,
  SwapperSection,
  SwapperStep,
} from '../src/shared/messages';

/**
 * Storybook / 非 Figma 環境で UI を表示するためのサンプルデータ。
 *
 * ⚠ 本番のトークン構造は Figma の Variable Collection が唯一のマスターで、プラグインは
 * 実行時に live から導出する (src/main/schema.ts)。ここの値は UI プレビュー用のダミーに
 * すぎず、本番ロジックには一切影響しない (Figma 側でトークンを編集しても、このファイルの
 * 更新は不要)。あくまで「Figma が無い環境で現実的な見た目を出す」ための固定サンプル。
 */

export const samplePresets: PresetSummary[] = [
  {
    id: 'expressive',
    name: 'Expressive',
    collectionIds: ['dimension-expressive', 'typography-expressive'],
  },
  {
    id: 'productive',
    name: 'Productive',
    collectionIds: ['dimension-productive', 'typography-productive'],
  },
];

const FONT_SIZE: ReadonlyArray<[string, number]> = [
  ['FontSize/xs', 11],
  ['FontSize/sm', 12],
  ['FontSize/md', 14],
  ['FontSize/lg', 16],
  ['FontSize/xl', 22],
  ['FontSize/2xl', 24],
  ['FontSize/3xl', 28],
  ['FontSize/4xl', 32],
  ['FontSize/5xl', 36],
  ['FontSize/6xl', 45],
  ['FontSize/7xl', 57],
];

export const sampleFontSizeOptions: RefOption[] = FONT_SIZE.map(([name, value]) => ({
  id: name,
  name,
  value,
}));

/** 共有の参照スケール (Reference の Sizing/*)。Token Swapper のドロップダウン候補。 */
const SIZING_SCALE: ReadonlyArray<[string, number]> = [
  ['Sizing/none', 0],
  ['Sizing/3xs', 1],
  ['Sizing/2xs', 2],
  ['Sizing/xs', 4],
  ['Sizing/sm', 8],
  ['Sizing/md', 12],
  ['Sizing/lg', 16],
  ['Sizing/xl', 20],
  ['Sizing/2xl', 24],
  ['Sizing/3xl', 28],
  ['Sizing/4xl', 32],
  ['Sizing/5xl', 40],
  ['Sizing/6xl', 48],
  ['Sizing/7xl', 56],
  ['Sizing/8xl', 64],
  ['Sizing/9xl', 128],
];

export const sampleRefOptions: RefOption[] = SIZING_SCALE.map(([name, value]) => ({
  id: name,
  name,
  value,
}));

/** name → option id を引く (= id は name と同じだが、main 側の構造に合わせて間接化)。 */
function refId(name: string): string | null {
  return sampleRefOptions.find((o) => o.name === name)?.id ?? null;
}

function fontSizeRefId(name: string): string | null {
  return sampleFontSizeOptions.find((o) => o.name === name)?.id ?? null;
}

/** "Spacing/Padding" と {step: 参照先名} からサンプルグループを作る。 */
function makeGroup(
  id: string,
  section: SwapperSection,
  mapping: ReadonlyArray<[string, string]>,
  opts?: RefOption[],
): SwapperGroup {
  const groupOptions = opts ?? sampleRefOptions;
  const findRefId = opts ? fontSizeRefId : refId;
  const steps: SwapperStep[] = mapping.map(([step, defaultRefName]) => ({
    id: `${id}/${step}`,
    step,
    defaultRefName,
    currentRefId: findRefId(defaultRefName),
  }));
  return { id, label: id, section, steps, options: groupOptions };
}

export const sampleSwapperGroups: SwapperGroup[] = [
  makeGroup('Spacing/Padding', 'spacing', [
    ['2xs', 'Sizing/2xs'],
    ['xs', 'Sizing/xs'],
    ['sm', 'Sizing/md'],
    ['md', 'Sizing/lg'],
    ['lg', 'Sizing/2xl'],
    ['xl', 'Sizing/4xl'],
    ['2xl', 'Sizing/5xl'],
  ]),
  makeGroup('Spacing/Margin', 'spacing', [
    ['sm', 'Sizing/2xs'],
    ['md', 'Sizing/xs'],
    ['lg', 'Sizing/sm'],
    ['xl', 'Sizing/md'],
  ]),
  makeGroup('Sizing/Icon', 'sizing', [
    ['sm', 'Sizing/lg'],
    ['md', 'Sizing/xl'],
    ['lg', 'Sizing/2xl'],
  ]),
  // Typography は役割 (Display/Headline/Title/Body/Label) でグルーピング、段は S/M/L。
  makeGroup('Display', 'typography', [
    ['Small', 'FontSize/5xl'],
    ['Medium', 'FontSize/6xl'],
    ['Large', 'FontSize/7xl'],
  ], sampleFontSizeOptions),
  makeGroup('Headline', 'typography', [
    ['Small', 'FontSize/2xl'],
    ['Medium', 'FontSize/3xl'],
    ['Large', 'FontSize/4xl'],
  ], sampleFontSizeOptions),
  makeGroup('Title', 'typography', [
    ['Small', 'FontSize/md'],
    ['Medium', 'FontSize/lg'],
    ['Large', 'FontSize/xl'],
  ], sampleFontSizeOptions),
  makeGroup('Body', 'typography', [
    ['Small', 'FontSize/sm'],
    ['Medium', 'FontSize/md'],
    ['Large', 'FontSize/lg'],
  ], sampleFontSizeOptions),
  makeGroup('Label', 'typography', [
    ['Small', 'FontSize/xs'],
    ['Medium', 'FontSize/sm'],
    ['Large', 'FontSize/md'],
  ], sampleFontSizeOptions),
];

/**
 * プリセットごとに異なる割り当てを返す (デモ用)。実機ではプリセット適用で System の参照先が
 * 変わるので、ここでも productive のときは各段を 2 段大きい Sizing へずらして「プリセットで
 * スライダーが変わる」ことを示す。
 */
export function sampleSwapperGroupsFor(presetId: string | null): SwapperGroup[] {
  if (presetId !== 'productive') return sampleSwapperGroups;
  const bump = (id: string | null): string | null => {
    if (!id) return id;
    const i = sampleRefOptions.findIndex((o) => o.id === id);
    if (i === -1) return id;
    return sampleRefOptions[Math.min(sampleRefOptions.length - 1, i + 2)]?.id ?? id;
  };
  return sampleSwapperGroups.map((g) => ({
    ...g,
    steps: g.steps.map((s) => ({ ...s, currentRefId: bump(s.currentRefId) })),
  }));
}

/**
 * 機能4 (チェックデザイン) のサンプル検査結果。デザイン 54:326 を再現: Dimension は全て OK、
 * Color は背景が実数指定で NG (要確認)、中の要素 (On) は OK。preview は Storybook では
 * バイト列を持てないため null (UI 側は「プレビューなし」を表示)。
 */
const sampleDimensionSection: CheckSection = {
  id: 'dimension',
  title: 'Dimension',
  rows: [
    { id: 'dimension.height', label: 'Component Height', status: 'pass', chip: 'Dimension System/Sizing/Component/Half/md', fixable: false, marker: { n: 1, group: 'dimension', shape: { kind: 'span', x1: 1.05, y1: 0, x2: 1.05, y2: 1 } } },
    { id: 'dimension.paddingTop', label: 'Padding Top', status: 'pass', chip: 'Dimension System/Spacing/Padding/sm', fixable: false, marker: { n: 2, group: 'dimension', shape: { kind: 'span', x1: 0.5, y1: 0.02, x2: 0.5, y2: 0.14 } } },
    { id: 'dimension.paddingBottom', label: 'Padding Bottom', status: 'pass', chip: 'Dimension System/Spacing/Padding/sm', fixable: false, marker: { n: 3, group: 'dimension', shape: { kind: 'span', x1: 0.5, y1: 0.86, x2: 0.5, y2: 0.98 } } },
    { id: 'dimension.paddingLeft', label: 'Padding Left', status: 'pass', chip: 'Dimension System/Spacing/Padding/lg', fixable: false, marker: { n: 4, group: 'dimension', shape: { kind: 'span', x1: 0.02, y1: 0.5, x2: 0.12, y2: 0.5 } } },
    { id: 'dimension.paddingRight', label: 'Padding Right', status: 'pass', chip: 'Dimension System/Spacing/Padding/lg', fixable: false, marker: { n: 5, group: 'dimension', shape: { kind: 'span', x1: 0.88, y1: 0.5, x2: 0.98, y2: 0.5 } } },
    { id: 'dimension.gap', label: 'Margin', status: 'pass', chip: 'Dimension System/Spacing/Margin/2xs', fixable: false, marker: { n: 6, group: 'dimension', shape: { kind: 'span', x1: 0.42, y1: 0.5, x2: 0.58, y2: 0.5 } } },
    { id: 'dimension.radius', label: 'Radius', status: 'pass', chip: 'Dimension System/Sizing/Radius/sm', fixable: false, marker: { n: 7, group: 'dimension', shape: { kind: 'circle', x: 0, y: 0, r: 0.12 } } },
  ],
};

export const sampleInspection: InspectionResult = {
  nodeId: 'sample-button',
  name: 'Button',
  description: 'Toyotaが提供するデザインシステム「Common UI」のユーティティプラグイン',
  preview: null,
  fixes: [
    {
      id: 'color.background#raw',
      label: 'Background',
      kind: 'color',
      before: '#000000',
      after: 'Color System/Brand/Primary',
      beforeValue: '#000000',
      afterValue: '#000000',
      defaultId: 'var-brand-primary',
      candidates: [
        { id: 'var-brand-primary', name: 'Color System/Brand/Primary', value: '#000000' },
        { id: 'var-brand-secondary', name: 'Color System/Brand/Secondary', value: '#1d4ed8' },
        { id: 'var-neutral-surface', name: 'Color System/Neutral/Surface', value: '#f5f5f5' },
      ],
    },
  ],
  sections: [
    sampleDimensionSection,
    {
      id: 'color',
      title: 'Color',
      rows: [
        {
          id: 'color.background',
          label: 'Background',
          status: 'fail',
          chip: '#000000',
          fixable: true,
          detail: 'Color System の背景カラー (On 以外) を指定してください。',
          marker: { n: 8, group: 'color', shape: { kind: 'point', x: 0.16, y: 0.74 } },
        },
        { id: 'color.on', label: 'On', status: 'pass', chip: 'Color System/Brand/OnPrimary', fixable: false, marker: { n: 9, group: 'color', shape: { kind: 'point', x: 0.64, y: 0.5 } } },
      ],
    },
  ],
};

/**
 * 機能4: State=Hover の検査結果。Background が「地色 (Brand/Primary) + StateLayers の半透明
 * オーバーレイ」の 2 枚 fill になるケースを再現する。1 行 2 チップ表示 (地色 + + + オーバーレイ) と、
 * 生値オーバーレイ (StateLayers 未バインド) を「要確認」で示す様子を確認できる。
 */
export const sampleInspectionHover: InspectionResult = {
  nodeId: 'sample-button-hover',
  name: 'Button / State=Hover',
  description: 'State=Hover では地色の上に StateLayers のオーバーレイが重なります。',
  preview: null,
  fixes: [
    {
      id: 'color.background#overlay',
      label: 'State Layer',
      kind: 'color',
      before: '#000000',
      after: 'Color System/StateLayers/DarkOpacity/8',
      beforeValue: '#000000',
      afterValue: '#000000',
      defaultId: 'var-sl-dark-8',
      candidates: [
        { id: 'var-sl-dark-8', name: 'Color System/StateLayers/DarkOpacity/8', value: '#000000' },
        { id: 'var-sl-dark-16', name: 'Color System/StateLayers/DarkOpacity/16', value: '#000000' },
        { id: 'var-sl-light-8', name: 'Color System/StateLayers/LightOpacity/8', value: '#ffffff' },
      ],
    },
  ],
  sections: [
    sampleDimensionSection,
    {
      id: 'color',
      title: 'Color',
      rows: [
        {
          id: 'color.background',
          label: 'Background',
          status: 'fail',
          chip: 'Color System/Brand/Primary',
          swatch: '#1d6fe5',
          fixable: true,
          detail: 'オーバーレイは Color System の StateLayers トークンを指定してください。',
          // 地色は OK、上に重ねた生値オーバーレイが要確認 (= StateLayers 未バインド)。
          fills: [
            { role: 'base', status: 'pass', chip: 'Color System/Brand/Primary', swatch: '#1d6fe5' },
            { role: 'overlay', status: 'fail', chip: '#000000', swatch: '#000000' },
          ],
          marker: { n: 8, group: 'color', shape: { kind: 'rect', x: 0, y: 0, w: 1, h: 1, r: 0.12 } },
        },
        { id: 'color.on', label: 'On', status: 'pass', chip: 'Color System/Brand/OnPrimary', fixable: false, marker: { n: 9, group: 'color', shape: { kind: 'rect', x: 0.3, y: 0.4, w: 0.4, h: 0.2 } } },
      ],
    },
  ],
};

/** 「適用」後の State=Hover (オーバーレイが StateLayers トークンへ寄り、両 fill とも OK)。 */
export const sampleInspectionHoverFixed: InspectionResult = {
  ...sampleInspectionHover,
  fixes: [],
  sections: [
    sampleDimensionSection,
    {
      id: 'color',
      title: 'Color',
      rows: [
        {
          id: 'color.background',
          label: 'Background',
          status: 'pass',
          chip: 'Color System/Brand/Primary',
          swatch: '#1d6fe5',
          fixable: false,
          fills: [
            { role: 'base', status: 'pass', chip: 'Color System/Brand/Primary', swatch: '#1d6fe5' },
            { role: 'overlay', status: 'pass', chip: 'Color System/StateLayers/DarkOpacity/8', swatch: '#000000' },
          ],
          marker: { n: 8, group: 'color', shape: { kind: 'rect', x: 0, y: 0, w: 1, h: 1, r: 0.12 } },
        },
        { id: 'color.on', label: 'On', status: 'pass', chip: 'Color System/Brand/OnPrimary', fixable: false, marker: { n: 9, group: 'color', shape: { kind: 'rect', x: 0.3, y: 0.4, w: 0.4, h: 0.2 } } },
      ],
    },
  ],
};

/**
 * 機能4 (複数選択) のサンプル Index。複数コンポーネントを選んだときの一覧 (デザイン 106:1019)。
 * preview は Storybook ではバイト列を持てないため null (サムネは空表示)。最後の 1 件は検査対象外。
 */
export const sampleComponentSummaries: ComponentSummary[] = [
  { nodeId: 'mc1', name: 'Button / Type=Primary, Size=Large, State=Default', preview: null, supported: true, pass: 8, fail: 0, fixCount: 0 },
  { nodeId: 'mc2', name: 'Button / Type=Secondary, Size=Small, State=Focused', preview: null, supported: true, pass: 6, fail: 2, fixCount: 2 },
  { nodeId: 'mc3', name: 'Chip / Type=Filter, State=Selected', preview: null, supported: true, pass: 5, fail: 1, fixCount: 1 },
  { nodeId: 'mc4', name: 'Card / Elevation=1', preview: null, supported: true, pass: 7, fail: 0, fixCount: 0 },
  { nodeId: 'mc5', name: 'Text Field / State=Error', preview: null, supported: true, pass: 4, fail: 3, fixCount: 2 },
  { nodeId: 'mc6', name: 'Divider', preview: null, supported: false, pass: 0, fail: 0, fixCount: 0 },
];

/** 「一括で修正」後の Index (全件 OK、修正対象なし)。単一適用デモ等で使う。 */
export const sampleComponentSummariesFixed: ComponentSummary[] = sampleComponentSummaries.map((it) =>
  it.supported ? { ...it, pass: it.pass + it.fail, fail: 0, fixCount: 0 } : it,
);

/**
 * 「一括で修正」後の残り。Color や値が変わる寸法は一括では直さないので、それらが残ったコンポーネント
 * だけが選択状態に残る (実機では figma.currentPage.selection が残りに絞られる)。ここでは元の subset
 * (Color の要確認が残った 2 件) を返し、UI が Index 表示のまま残りに絞り込まれる様子を再現する。
 */
export const sampleComponentSummariesAfterBulk: ComponentSummary[] = [
  { nodeId: 'mc2', name: 'Button / Type=Secondary, Size=Small, State=Focused', preview: null, supported: true, pass: 7, fail: 1, fixCount: 1 },
  { nodeId: 'mc5', name: 'Text Field / State=Error', preview: null, supported: true, pass: 6, fail: 1, fixCount: 1 },
];

/** nodeId → コンポーネント名 (mock の inspect-node 応答でドリルイン先の名前を引く)。 */
export function sampleComponentName(nodeId: string): string {
  return sampleComponentSummaries.find((it) => it.nodeId === nodeId)?.name ?? 'Component';
}

/**
 * FixDiffModal (適用前の確認モーダル) 用のサンプル差分一式。Dimension / Color を混在させ、
 * 「値が変わらない (緑 ✓)」と「トークンの中の実数・色が変わる (黄 ?)」の両方を網羅する。
 * candidates が 2 件以上ある行はモーダル上でドロップダウンになり、選び直せる。
 */
export const sampleFixDiffs: FixDiff[] = [
  // Dimension: 実数 24 → トークン (値そのまま = 緑 ✓)。候補 3 件 → ドロップダウンで選び直せる。
  {
    id: 'dimension.paddingLeft',
    label: 'Padding Left',
    kind: 'dimension',
    before: '24',
    after: 'Dimension System/Spacing/Padding/lg',
    beforeValue: '24',
    afterValue: '24',
    defaultId: 'var-padding-lg',
    candidates: [
      { id: 'var-padding-md', name: 'Dimension System/Spacing/Padding/md', value: '16' },
      { id: 'var-padding-lg', name: 'Dimension System/Spacing/Padding/lg', value: '24' },
      { id: 'var-padding-xl', name: 'Dimension System/Spacing/Padding/xl', value: '32' },
    ],
  },
  // Dimension: トークン → 別トークン (12 → 8 で実数が変わる = 黄 ?)。
  {
    id: 'dimension.radius',
    label: 'Radius',
    kind: 'dimension',
    before: 'Dimension System/Sizing/Radius/md',
    after: 'Dimension System/Sizing/Radius/sm',
    beforeValue: '12',
    afterValue: '8',
    defaultId: 'var-radius-sm',
    candidates: [
      { id: 'var-radius-sm', name: 'Dimension System/Sizing/Radius/sm', value: '8' },
      { id: 'var-radius-md', name: 'Dimension System/Sizing/Radius/md', value: '12' },
    ],
  },
  // Color: 実数 hex → トークン (色そのまま = 緑 ✓)。候補にスウォッチ色つき。
  {
    id: 'color.on#raw',
    label: 'On',
    kind: 'color',
    before: '#ffffff',
    after: 'Color System/Brand/OnPrimary',
    beforeValue: '#ffffff',
    afterValue: '#ffffff',
    defaultId: 'var-brand-on-primary',
    candidates: [
      { id: 'var-brand-on-primary', name: 'Color System/Brand/OnPrimary', value: '#ffffff' },
      { id: 'var-neutral-on-surface', name: 'Color System/Neutral/OnSurface', value: '#1d1d1d' },
    ],
  },
  // Color: 実数 hex → トークン (#0b1020 → #000000 で色が変わる = 黄 ?)。
  {
    id: 'color.background#raw',
    label: 'Background',
    kind: 'color',
    before: '#0b1020',
    after: 'Color System/Brand/Primary',
    beforeValue: '#0b1020',
    afterValue: '#000000',
    defaultId: 'var-brand-primary',
    candidates: [
      { id: 'var-brand-primary', name: 'Color System/Brand/Primary', value: '#000000' },
      { id: 'var-brand-secondary', name: 'Color System/Brand/Secondary', value: '#1d4ed8' },
      { id: 'var-neutral-surface', name: 'Color System/Neutral/Surface', value: '#f5f5f5' },
    ],
  },
];

/** 「適用」後の状態 (背景も OK になり、修正対象なし)。 */
export const sampleInspectionFixed: InspectionResult = {
  ...sampleInspection,
  fixes: [],
  sections: [
    sampleDimensionSection,
    {
      id: 'color',
      title: 'Color',
      rows: [
        { id: 'color.background', label: 'Background', status: 'pass', chip: 'Color System/Brand/Primary', fixable: false, marker: { n: 8, group: 'color', shape: { kind: 'point', x: 0.16, y: 0.74 } } },
        { id: 'color.on', label: 'On', status: 'pass', chip: 'Color System/Brand/OnPrimary', fixable: false, marker: { n: 9, group: 'color', shape: { kind: 'point', x: 0.64, y: 0.5 } } },
      ],
    },
  ],
};

// 機能5: 横断チェックのサンプル結果 (ボタンを模した Type × Size × State)。
// 背景色 (background) は Size 方向で揃うべき (free=Size)。Primary/Enabled の Large が別トークンの外れ値、
// Ghost/Hover は票が割れた ambiguous グループ。修正後 (Aligned) は不整合が消える。
export const sampleConsistencyReport: ConsistencyReport = {
  setNodeId: 'set:button',
  setName: 'Button',
  axes: ['Type', 'Size', 'State'],
  axisValues: {
    Type: ['Primary', 'Secondary', 'Ghost'],
    Size: ['Small', 'Medium', 'Large'],
    State: ['Enabled', 'Hover'],
  },
  variantCount: 18,
  totalOutliers: 3,
  ambiguousCount: 1,
  properties: [
    {
      // 複数外れ値 (寸法) — 比較軸 Size をまたいで Radius が揃うべきグループ。
      property: 'dimension.radius',
      label: 'Radius',
      kind: 'dimension',
      freeAxes: ['Size'],
      govAxes: ['Type', 'State'],
      inferable: true,
      axisConsistency: { Type: 0.0, Size: 1.0, State: 0.0 },
      outlierCount: 2,
      groups: [
        {
          key: { Type: 'Secondary', State: 'Enabled' },
          label: 'Type=Secondary, State=Enabled',
          ambiguous: false,
          expected: {
            token: 'Dimension System/Sizing/Radius/md',
            tokenId: 'var:radius-md',
            value: '8',
            count: 1,
            total: 3,
          },
          cells: [
            { nodeId: 'btn:s-s-en', axes: { Type: 'Secondary', Size: 'Small', State: 'Enabled' }, label: 'Size=Small', token: 'Dimension System/Sizing/Radius/sm', tokenId: 'var:radius-sm', value: '4', valid: true },
            { nodeId: 'btn:s-m-en', axes: { Type: 'Secondary', Size: 'Medium', State: 'Enabled' }, label: 'Size=Medium', token: 'Dimension System/Sizing/Radius/md', tokenId: 'var:radius-md', value: '8', valid: true },
            { nodeId: 'btn:s-l-en', axes: { Type: 'Secondary', Size: 'Large', State: 'Enabled' }, label: 'Size=Large', token: 'Dimension System/Sizing/Radius/lg', tokenId: 'var:radius-lg', value: '12', valid: true },
          ],
          outliers: [
            { nodeId: 'btn:s-s-en', axes: { Type: 'Secondary', Size: 'Small', State: 'Enabled' }, label: 'Size=Small', token: 'Dimension System/Sizing/Radius/sm', tokenId: 'var:radius-sm', value: '4', valid: true },
            { nodeId: 'btn:s-l-en', axes: { Type: 'Secondary', Size: 'Large', State: 'Enabled' }, label: 'Size=Large', token: 'Dimension System/Sizing/Radius/lg', tokenId: 'var:radius-lg', value: '12', valid: true },
          ],
        },
      ],
    },
    {
      property: 'color.background',
      label: '背景色',
      kind: 'color',
      freeAxes: ['Size'],
      govAxes: ['Type', 'State'],
      inferable: true,
      axisConsistency: { Type: 0.0, Size: 1.0, State: 0.0 },
      outlierCount: 1,
      groups: [
        {
          key: { Type: 'Primary', State: 'Enabled' },
          label: 'Type=Primary, State=Enabled',
          ambiguous: false,
          expected: {
            token: 'Color System/Brand/Primary',
            tokenId: 'var:brand-primary',
            value: '#0d99ff',
            count: 2,
            total: 3,
          },
          cells: [
            { nodeId: 'btn:p-s-en', axes: { Type: 'Primary', Size: 'Small', State: 'Enabled' }, label: 'Size=Small', token: 'Color System/Brand/Primary', tokenId: 'var:brand-primary', value: '#0d99ff', valid: true },
            { nodeId: 'btn:p-m-en', axes: { Type: 'Primary', Size: 'Medium', State: 'Enabled' }, label: 'Size=Medium', token: 'Color System/Brand/Primary', tokenId: 'var:brand-primary', value: '#0d99ff', valid: true },
            { nodeId: 'btn:p-l-en', axes: { Type: 'Primary', Size: 'Large', State: 'Enabled' }, label: 'Size=Large', token: 'Color System/Brand/Secondary', tokenId: 'var:brand-secondary', value: '#7a5cff', valid: true },
          ],
          outliers: [
            { nodeId: 'btn:p-l-en', axes: { Type: 'Primary', Size: 'Large', State: 'Enabled' }, label: 'Size=Large', token: 'Color System/Brand/Secondary', tokenId: 'var:brand-secondary', value: '#7a5cff', valid: true },
          ],
        },
        {
          key: { Type: 'Ghost', State: 'Hover' },
          label: 'Type=Ghost, State=Hover',
          ambiguous: true,
          expected: null,
          candidates: [
            { tokenId: 'var:sl-8', token: 'Color System/StateLayers/DarkOpacity/8', value: '#0000000a', count: 1 },
            { tokenId: 'var:sl-16', token: 'Color System/StateLayers/DarkOpacity/16', value: '#00000029', count: 1 },
          ],
          cells: [
            { nodeId: 'btn:g-s-ho', axes: { Type: 'Ghost', Size: 'Small', State: 'Hover' }, label: 'Size=Small', token: 'Color System/StateLayers/DarkOpacity/8', tokenId: 'var:sl-8', value: '#0000000a', valid: true },
            { nodeId: 'btn:g-m-ho', axes: { Type: 'Ghost', Size: 'Medium', State: 'Hover' }, label: 'Size=Medium', token: 'Color System/StateLayers/DarkOpacity/16', tokenId: 'var:sl-16', value: '#00000029', valid: true },
          ],
          outliers: [],
        },
      ],
    },
  ],
};

/** 修正後: 不整合なし (横断チェックが緑になる様子を再現)。 */
export const sampleConsistencyReportAligned: ConsistencyReport = {
  ...sampleConsistencyReport,
  totalOutliers: 0,
  ambiguousCount: 0,
  properties: [],
};
