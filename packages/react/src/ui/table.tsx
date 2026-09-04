"use client";

import {
  createContext,
  forwardRef,
  useContext,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import clsx from "clsx";

export type TableSize = "sm" | "md" | "lg";
export type TableCellType = "text" | "slot" | "checkbox";

const TableSizeContext = createContext<TableSize>("md");

// 行高 40/48/56px（Header Cell / Body Cell 共通、token: sizing-component-full-{sm,md,lg}）。
// height は table-cell では「最小の高さ」として解決されるため、内容がこれより小さければ
// このトークンどおりの行高になり、大きければ内容に追従して伸びる。
const CELL_HEIGHT_CLASS: Record<TableSize, string> = {
  sm: "h-component-full-sm",
  md: "h-component-full-md",
  lg: "h-component-full-lg",
};

// セル内側余白は全 size・全 Type 共通で横 padding-md（16px）・縦 padding-xs（8px）。
const CELL_PADDING_CLASS = "px-padding-md py-padding-xs";

// Header Cell のタイポグラフィ（Standard/Title/{Small,Medium,Large} = 14/16/22px）。
const HEADER_TYPOGRAPHY_CLASS: Record<TableSize, string> = {
  sm: "typography-standard-title-small",
  md: "typography-standard-title-medium",
  lg: "typography-standard-title-large",
};

// Body Cell のタイポグラフィ（Standard/Body/{Small,Medium,Large} = 12/14/16px）。
const BODY_TYPOGRAPHY_CLASS: Record<TableSize, string> = {
  sm: "typography-standard-body-small",
  md: "typography-standard-body-medium",
  lg: "typography-standard-body-large",
};

// Hover の state layer（黒7.8%、Checkbox の Hover と同強度）。
// Body Cell は優先度（Disabled > Focused > Hover）に従い、disabled 中・focus-within 中は出さない。
const BODY_HOVER_LAYER_CLASS =
  "[&:hover:not([data-disabled]):not(:focus-within)]:state-layer-8";

// Header Cell には Focused の視覚（focus リング）も disabled も無いため、ガード無しで hover を出す。
const HEADER_HOVER_LAYER_CLASS = "[&:hover]:state-layer-8";

// Focused の共有 focus リング（outline-focus、2px）。border-collapse で隣接セルに侵食しないよう inset にする。
const FOCUS_RING_CLASS =
  "[&:focus-within:not([data-disabled])]:[box-shadow:inset_0_0_0_var(--border-width-md)_var(--color-outline-focus)]";

// CheckBox Type の Body Cell 限定: Figma の CheckBox セル Focused variant はセルにだけリングが付き、
// 内包 Checkbox にリングは無い。そのままだと Checkbox 自身の focus-visible リングと二重になるため
// 抑制する（:focus-visible を重ねて詳細度を上げ、生成順に依らず共有リングに勝たせる）。
// disabled セルではセルのリング自体が出ないため抑制せず、Checkbox 自身のリングを生かして
// フォーカス表示が完全に消えるのを防ぐ。Slot / Text セルには適用しない（複数コントロールの判別を優先）。
const CHECKBOX_CELL_FOCUS_SUPPRESS_CLASS =
  "[&:not([data-disabled])_:focus-visible:focus-visible]:shadow-none";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** 行高（40/48/56px）を決める size。Header Cell / Body Cell 共通。既定は md。 */
  size?: TableSize;
}

const TableRoot = forwardRef<HTMLTableElement, TableProps>(function Table(
  { size = "md", className, children, ...rest },
  ref,
) {
  return (
    // 横幅超過時に行対応を保ったままスクロールする領域（AC-Table-12）。
    // tabIndex=0 + role=region で、横スクロール発生時もキーボードで領域に到達して
    // スクロールできるようにする（GOV.UK 等の確立パターン）。
    // アクセシブルネームの自動配線（caption との aria-labelledby 連結）は未対応（notes.md 参照）。
    <div
      data-table-scroll=""
      tabIndex={0}
      role="region"
      className="w-full overflow-x-auto"
    >
      <TableSizeContext.Provider value={size}>
        {/* text-on-surface を table に置き、素の <caption> にもトークン文字色を継承させる。 */}
        <table
          {...rest}
          ref={ref}
          data-size={size}
          className={clsx("w-full border-collapse text-on-surface", className)}
        >
          {children}
        </table>
      </TableSizeContext.Provider>
    </div>
  );
});
TableRoot.displayName = "Table";

const TableHead = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHead(props, ref) {
  return <thead {...props} ref={ref} />;
});
TableHead.displayName = "Table.Head";

const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody(props, ref) {
  return <tbody {...props} ref={ref} />;
});
TableBody.displayName = "Table.Body";

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  function TableRow(props, ref) {
    return <tr {...props} ref={ref} />;
  },
);
TableRow.displayName = "Table.Row";

// Header/Body Cell 共通の内容ラップ。children + 末尾 trailingIcon を横並びにし、gap は padding-xs（8px）。
// table-cell の上に直接 flex を張ると列レイアウトが壊れるため、内側にラップ要素を置く。
// CheckBox Type は内容（Checkbox）をセル中央に揃える。
// ラップは必要なときだけ: trailingIcon 無しの text/slot セルは children を素で描画し、
// td/th への text-align 等の className がそのまま効くようにする。
// trailingIcon はアイコンスロットとしてサイズ（icon-sm=16px、Figma 実測）と配置を担保し、
// 装飾なので aria-hidden にする（Dropdown の ICON_CLASS 慣例に準拠）。
function CellContent({
  type,
  trailingIcon,
  children,
}: {
  type: TableCellType;
  trailingIcon?: ReactNode;
  children?: ReactNode;
}) {
  if (trailingIcon == null && type !== "checkbox") {
    return <>{children}</>;
  }
  return (
    <span
      className={clsx(
        "flex items-center gap-padding-xs",
        type === "checkbox" && "justify-center",
      )}
    >
      {children}
      {trailingIcon != null && (
        <span
          className="inline-flex shrink-0 items-center justify-center size-icon-sm"
          aria-hidden="true"
        >
          {trailingIcon}
        </span>
      )}
    </span>
  );
}

export interface TableHeaderCellProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "children"> {
  /** 列見出し（col, 既定）か行見出し（row）か。 */
  scope?: "col" | "row";
  /** Text（既定）/ Slot / CheckBox。Figma の Type variant に対応。 */
  type?: TableCellType;
  /** Text Type の末尾アイコンスロット。 */
  trailingIcon?: ReactNode;
  children?: ReactNode;
}

const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell(
    { scope = "col", type = "text", trailingIcon, className, children, ...rest },
    ref,
  ) {
    const size = useContext(TableSizeContext);
    return (
      <th
        {...rest}
        ref={ref}
        scope={scope}
        data-type={type}
        className={clsx(
          "bg-surface-container text-on-surface align-middle",
          CELL_HEIGHT_CLASS[size],
          CELL_PADDING_CLASS,
          HEADER_TYPOGRAPHY_CLASS[size],
          HEADER_HOVER_LAYER_CLASS,
          className,
        )}
      >
        <CellContent type={type} trailingIcon={trailingIcon}>
          {children}
        </CellContent>
      </th>
    );
  },
);
TableHeaderCell.displayName = "Table.HeaderCell";

export interface TableCellProps
  extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "children"> {
  /** Text（既定）/ Slot / CheckBox。Figma の Type variant に対応。 */
  type?: TableCellType;
  /** Text Type の末尾アイコンスロット。 */
  trailingIcon?: ReactNode;
  /** opt-in の disabled。文字色・境界線色を disabled 系トークンに差し替える。 */
  disabled?: boolean;
  children?: ReactNode;
}

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { type = "text", trailingIcon, disabled = false, className, children, ...rest },
  ref,
) {
  const size = useContext(TableSizeContext);
  return (
    <td
      {...rest}
      ref={ref}
      data-type={type}
      data-disabled={disabled ? "" : undefined}
      className={clsx(
        "bg-surface border-b-sm border-outline text-on-surface align-middle",
        CELL_HEIGHT_CLASS[size],
        CELL_PADDING_CLASS,
        BODY_TYPOGRAPHY_CLASS[size],
        BODY_HOVER_LAYER_CLASS,
        FOCUS_RING_CLASS,
        type === "checkbox" && CHECKBOX_CELL_FOCUS_SUPPRESS_CLASS,
        "data-[disabled]:text-on-disabled data-[disabled]:border-disabled",
        className,
      )}
    >
      <CellContent type={type} trailingIcon={trailingIcon}>
        {children}
      </CellContent>
    </td>
  );
});
TableCell.displayName = "Table.Cell";

export const Table = Object.assign(TableRoot, {
  Head: TableHead,
  Body: TableBody,
  Row: TableRow,
  HeaderCell: TableHeaderCell,
  Cell: TableCell,
});
