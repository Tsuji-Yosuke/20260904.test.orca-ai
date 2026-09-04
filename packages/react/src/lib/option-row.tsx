"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Select と Search が共有する候補行（Item/Option）の視覚専用モジュール。
 *
 * Figma `Select/Menu/MenuItem`（node 1688:26347）の Enabled/Hover/Focused/Active/Disabled
 * 5 状態を、Base UI の `Select.Item`（SelectItem）と `Autocomplete.Item`（ComboboxItem）が
 * 出す `data-highlighted` / `data-selected` / `data-disabled` から駆動する。
 * Base UI の Root/Context には一切触れない、非公開の視覚のみのプリミティブ。
 * 判断根拠: plans/spike-notes/010-option-primitive-design.md（案A）。
 *
 * @orca/react の index.ts からは export しない（内部専用）。
 */

export interface OptionRowClassNameOptions {
  /**
   * 選択済み（data-selected）を行全面の黒塗り + 前景反転で表現するか。
   * Select のみ true にする。Search は「一時的な候補提示」であり永続的な
   * 選択済み表現を持たないため false のまま使う（Select.md AC-Select-11）。
   */
  selectable?: boolean;
}

/**
 * Row Container（Item 要素自体）に渡す className。
 *
 * Base UI はポインタ重畳とキーボード操作の両方を同じ `data-highlighted` に
 * 統合するため、属性だけでは Hover と Focused を区別できない。そこで
 * `:hover` の有無で判別する（focus-visible と同じ発想）:
 * - ポインタ重畳中（:hover）→ state layer の重畳のみ（Figma の Hover）
 * - ポインタ非重畳で data-highlighted → 共有 focus リング（Figma の Focused、
 *   キーボード操作時に相当）
 */
export function optionRowClassName({
  selectable = false,
}: OptionRowClassNameOptions = {}): string {
  return clsx(
    // 行高は Figma MenuItem（node 1688:26347、2026-08-07 再実測）の component/full/sm（40px）を
    // 下限高として固定し、テキスト拡大時は内容を切らずに伸びる（height token + min-h の写像規約）。
    // 横 padding 16px（padding/md）・アイコンと Label の gap 8px（margin/lg）も同実測。
    "flex min-h-component-full-sm items-center gap-margin-lg px-padding-md",
    "typography-tight-body-small text-on-surface",
    "cursor-default select-none outline-none",
    // Hover: state layer の重畳（disabled には付けない）
    "[&:hover:not([data-disabled])]:state-layer-8",
    // Focused（キーボードによるハイライト）: ポインタ非重畳時のみ共有 focus リング
    "[&[data-highlighted]:not(:hover)]:shadow-focus-outline",
    // Disabled: 背景は変えず文字色のみ弱める（Select.md Visual Semantics）
    "data-[disabled]:text-on-disabled data-[disabled]:cursor-not-allowed",
    // Active（選択済み）: 行全面の黒塗り + 前景反転。Select のみ opt-in。
    selectable && "data-[selected]:bg-primary data-[selected]:text-on-primary",
  );
}

/** Item の主内容。1 行省略。 */
export function OptionRowLabel({ children }: { children: ReactNode }) {
  return <span className="min-w-0 flex-1 truncate">{children}</span>;
}

/**
 * Item 任意の Leading / Trailing Icon スロット（Select.md AC-Select-13）。
 * 行の Size に依らず 16px 固定。装飾でありアクセシブルネームに寄与しない。
 * 前景色は指定せず、Label の前景色（Active の反転・Disabled の弱色）に追従させる。
 */
export function OptionRowIcon({ children }: { children: ReactNode }) {
  return (
    <span
      data-item-icon
      aria-hidden="true"
      className="shrink-0 inline-flex size-icon-sm items-center justify-center"
    >
      {children}
    </span>
  );
}
