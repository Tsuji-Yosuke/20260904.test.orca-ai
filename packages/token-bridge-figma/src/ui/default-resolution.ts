import type { DiffEntry, DiffResolution } from "../core/types.js";

// 過渡期方針（Figma 構造刷新中）:
// repo を Figma の完全な鏡にするため、初期選択は原則 figma-to-repo とする。
// figma-to-repo は Figma を一切変更せず、repo 側だけを Figma に合わせる
// （Figma に在れば upsert、Figma に無ければ repo から除去）。結果はレビュー可能な PR に出る。
//
// 過渡期が終わったら、entry の changeKind / missingSide / preferredDirection に応じた
// 従来の方向別ロジックに戻す。詳細は docs/sync-spec.md「初期選択の仕様」を参照。
export function defaultResolution(_entry: DiffEntry): DiffResolution {
  return "figma-to-repo";
}
