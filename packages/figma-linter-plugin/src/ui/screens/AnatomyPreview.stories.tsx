import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CheckRow, CheckSection, InspectionPreview } from '../../shared/messages';
import { PreviewBox, collectRegions } from './CheckScreen';

/**
 * アナトミープレビュー (デザイン 93:755) の見た目検証用ストーリー。CheckScreen 全体の
 * messaging mock では Figma が無くプレビュー画像を持てない (= 「プレビューなし」) ため、
 * ここでは内部の PreviewBox を直接描画する。サンプルのボタン PNG を渡し、Default / 警告
 * (非システムトークン) / hover の 3 状態を再現する。
 */

// 透過 PNG のサンプルボタン。200x88 の中にボタン本体 (146x48) + drop shadow を配置して書き出し (2x)。
// 実機の exportAsync が effect を含む状況を再現し、content で本体位置を渡すズレ防止の検証に使う。
const BUTTON_PNG_B64 =
  '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bbPNNsMhNvaaeL0mF7/++mtHnUN1KoODgx31n376icBcmnD/GfC1SyG2sHY7F2sS3QfbMDdQEmWHOtZZZ510BVieEc2L+YXkQOaff/40B/Lmm29SKOxJsECwODBHHXVUui7UZpttRt9//33adtJJJ6U5DGbs2LFpH85PHHTQQWkbv/ti6623pscee8x6rSoxLFjYJPos1NZ4GxajgEAYRjB5jH+vsPhw8nq55ZbraGcx++ijj2jNNddMV4J96KGH6Omnn05FheFw1korrUT77LMPzTvvvPTnn3+mdRt6fgcCAjxQbWJUI7Fi90BGjIiM5NEv7Dkstthi6bLdeggnBBaCrbbaKn2nReY1+PDoo492iUfGIosskooLLzbII8RYLHjLngSXK664go455pj0nRXsofDy4zZYaFTqft9GBkZfRUt0oqHSpBBWX3smI3km8E033US77LLLcN0nbCWRhYfYE+BRUdlrUW1ccMEFYr5DZcEFF6Q33niD1lhjjfQ1rY888kia/+CF/c4666yOlzC50AXkl19+oRjATPQoaJyNa2oOxDavBDQM3ajqeYJQeB7JRRddlC79ffzxxxv77b333nTcccd1tb///vu08sord1wHiwiH11ZZZZX05Uv8tr48I6T+9re/ddR9XxsL+gbdVjX6wbgpw3hDgJCUCIc6mhLu4Hdom9hggw3oxhtv7Go//fTTadVVV029Ej2cxq9Xfeutt1IPKe/w2oUXXrij/sMPPxDwp0n3n0Zf2qUmj8LqK7In4QsvvJBipoxQx6xZs9Incc4f8BDcPHmQcePGddQ//vhjY0KePZNnnnmmK6HNCfKpU6em+0899RTtvPPOdO+993Z4IosvvngqIuyh6ENwfeCcigrnfWJgJN9/ID91LmWS/e+V3nvO++o7z6UlTPStXh6lBpEZEswEDodDSrfeemtH29FHH53O59DhmeCcFNcNOXsCPBFQF4UDDzwwfVe4Doe5OCcSOoqK53XwUOOMvfbai2677bbhOosoh8cyOGnPc050Dj74YPrmm2/o7rvvpiLA/Vc6/0Zzly1Ry2xhKy1lwvvSMibZ05b+TnV1S4Z6z/RjCAuMMDKvIYOT6JdffnlXP14mRRIPDknx6C3Jo+B5HhzW0uFcyEsvvUQhZGt1qXz44YcUCofXrrzyylQ0ef0sAOoCAgKC4FCHlHiu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';

function toBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// content = 画像内のボタン本体 (影を除いた実ジオメトリ) の位置 (x=27/200, y=20/88, w=146/200, h=48/88)。
const samplePreview: InspectionPreview = {
  bytes: toBytes(BUTTON_PNG_B64),
  width: 200,
  height: 88,
  content: { x: 0.135, y: 0.227, w: 0.73, h: 0.545 },
};

interface DemoOpts {
  /** Padding Left を非システムトークン (実数) 扱いにする。 */
  fail?: boolean;
  /** Padding Top を none(=0) にして帯が消える (バッジは残る) ことを確認する。 */
  zeroTop?: boolean;
}

/** Dimension 行。 */
function dimRows({ fail = false, zeroTop = false }: DemoOpts): CheckRow[] {
  return [
    { id: 'dimension.height', label: 'Component Height', status: 'pass', chip: 'Dimension System/Sizing/Component/Half/md', fixable: false, marker: { n: 1, group: 'dimension', shape: { kind: 'span', x1: 1.05, y1: 0, x2: 1.05, y2: 1 } } },
    // zeroTop のとき厚み 0 (none) → 帯は消えてバッジ "none" だけ残る。
    { id: 'dimension.paddingTop', label: 'Padding Top', status: 'pass', chip: zeroTop ? 'Dimension System/Spacing/Padding/none' : 'Dimension System/Spacing/Padding/xl', fixable: false, marker: { n: 2, group: 'dimension', shape: { kind: 'span', x1: 0.5, y1: 0, x2: 0.5, y2: zeroTop ? 0 : 0.167 } } },
    { id: 'dimension.paddingBottom', label: 'Padding Bottom', status: 'pass', chip: 'Dimension System/Spacing/Padding/xl', fixable: false, marker: { n: 3, group: 'dimension', shape: { kind: 'span', x1: 0.5, y1: 0.833, x2: 0.5, y2: 1 } } },
    { id: 'dimension.paddingLeft', label: 'Padding Left', status: fail ? 'fail' : 'pass', chip: fail ? '24' : 'Dimension System/Spacing/Padding/2xl', fixable: fail, marker: { n: 4, group: 'dimension', shape: { kind: 'span', x1: 0, y1: 0.5, x2: 0.164, y2: 0.5 } } },
    { id: 'dimension.paddingRight', label: 'Padding Right', status: 'pass', chip: 'Dimension System/Spacing/Padding/2xl', fixable: false, marker: { n: 5, group: 'dimension', shape: { kind: 'span', x1: 0.836, y1: 0.5, x2: 1, y2: 0.5 } } },
    // Margin は子が 3 つ (icon/label/icon) で gap が 2 つ → shape + extraShapes で 2 本の帯。
    { id: 'dimension.gap', label: 'Margin', status: 'pass', chip: 'Dimension System/Spacing/Margin/lg', fixable: false, marker: { n: 6, group: 'dimension', shape: { kind: 'span', x1: 0.3, y1: 0.5, x2: 0.356, y2: 0.5 }, extraShapes: [{ kind: 'span', x1: 0.644, y1: 0.5, x2: 0.7, y2: 0.5 }] } },
    // 角丸マークは実 radius のサイズ (サンプルは 6px / 146 ≈ 0.041)。
    { id: 'dimension.radius', label: 'Radius', status: 'pass', chip: 'Dimension System/Sizing/Radius/lg', fixable: false, marker: { n: 7, group: 'dimension', shape: { kind: 'circle', x: 0, y: 0, r: 0.041 } } },
  ];
}

function colorRows(): CheckRow[] {
  return [
    // Bg = コンポーネント塗り全体の矩形 (角丸 sm 4px / 146 ≈ 0.027)。
    { id: 'color.background', label: 'Background', status: 'pass', chip: 'Color System/Brand/Primary', fixable: false, swatch: '#000000', marker: { n: 8, group: 'color', shape: { kind: 'rect', x: 0, y: 0, w: 1, h: 1, r: 0.027 } } },
    // On = On カラーを使う中身を要素ごとにオーバーレイ (左アイコン / ラベル / 右アイコンの 3 個)。
    { id: 'color.on', label: 'On', status: 'pass', chip: 'Color System/Brand/OnPrimary', fixable: false, swatch: '#ffffff', marker: { n: 9, group: 'color', shape: { kind: 'rect', x: 0.175, y: 0.33, w: 0.125, h: 0.34 }, extraShapes: [{ kind: 'rect', x: 0.356, y: 0.29, w: 0.288, h: 0.42 }, { kind: 'rect', x: 0.7, y: 0.33, w: 0.125, h: 0.34 }] } },
  ];
}

function buildSections(opts: DemoOpts): CheckSection[] {
  return [
    { id: 'dimension', title: 'Dimension', rows: dimRows(opts) },
    { id: 'color', title: 'Color', rows: colorRows() },
  ];
}

function Demo({ fail = false, zeroTop = false, highlight = null }: DemoOpts & { highlight?: number | null }) {
  return (
    <PreviewBox preview={samplePreview} regions={collectRegions(buildSections({ fail, zeroTop }))} highlightN={highlight} />
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Plugin/AnatomyPreview',
  component: Demo,
  tags: ['autodocs'],
  parameters: { figmaFrame: { width: 360, height: 200, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof Demo>;

/** Default: 全部 pass。padding/margin が灰の帯、Radius は青アーク、Bg/On は色スウォッチ。 */
export const Default: Story = {};

/** 非システムトークン: Padding Left が実数 → オレンジの帯 + 「?」チップ。 */
export const HasError: Story = { args: { fail: true } };

/** hover: Padding Left (n=4) を強調 → 緑の帯 + 緑チップ、他はディム。 */
export const Hover: Story = { args: { highlight: 4 } };

/** hover かつトークン未指定: Padding Left を hover + fail → 緑ではなくエラー色 (#dd500e) で強調。 */
export const HoverError: Story = { args: { fail: true, highlight: 4 } };

/** トークン none(=0): Padding Top の塗り帯が消え、バッジ "none" は残る。 */
export const ZeroPaddingTop: Story = { args: { zeroTop: true } };

/** 別行 hover 中の fail 表示: Padding Top(n=2) を hover → fail の Padding Left は dim でも「?」のまま。 */
export const HoverDimError: Story = { args: { fail: true, highlight: 2 } };

/** Bg hover: コンポーネント塗り全体に緑オーバーレイ + Bg バッジ緑、他はディム。 */
export const BgHover: Story = { args: { highlight: 8 } };

/** On hover: 中身 (アイコン/ラベル) の領域に緑オーバーレイ + On バッジ緑、他はディム。 */
export const OnHover: Story = { args: { highlight: 9 } };
