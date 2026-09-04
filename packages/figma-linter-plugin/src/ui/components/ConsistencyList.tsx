import { useState } from 'react';
import type {
  ConsistencyGroup,
  ConsistencyPropertyReport,
  ConsistencyReport,
  VariantCellSummary,
} from '../../shared/messages';

/**
 * 機能5: 横断チェック (Variant Consistency) の結果表示 (デザイン 130:1093)。
 *
 * 「プロパティ × 固定軸グループ = カード 1 枚」。カードは横断チェックの構図をそのまま見せる:
 * 上に「[揃え先トークン] に揃える」+「修正」ボタン、下に比較軸 (free) の各値を 1 行ずつ並べ、
 * 各行に現在のトークンを TokenSelect ピルで出す。揃っている行は淡いタグ、外れている行は
 * オレンジのラベル + 選び直せるドロップダウンにする。「修正」でそのカードの外れを揃え先へ寄せる。
 *
 * 推論の内部指標 (free/gov・一定度など) は出さず、「何を・どこが外れ・どう直すか」だけ見せる。
 */

/** 1 件の「揃える」操作 (外れ値ノードを refId のトークンへ再バインド)。 */
export interface ConsistencyFix {
  nodeId: string;
  property: string;
  refId: string;
}

interface ConsistencyListProps {
  report: ConsistencyReport;
  /** 適用中 (ボタンを無効化)。 */
  busy: boolean;
  onApply: (fixes: ConsistencyFix[]) => void;
}

/** 揃え先の選択肢 1 件 (グループ内で実在するトークン)。 */
interface TokenOption {
  tokenId: string;
  token: string;
  value: string | null;
  count: number;
}

/** "Color System/Brand/Primary" → "Brand/Primary" (コレクション名を落とした短縮表示)。 */
function shortName(name: string): string {
  const segs = name.split('/');
  return segs.length > 1 ? segs.slice(1).join('/') : name;
}

/** グループ内で実在する有効トークンを件数つきで集計 (揃え先の候補)。多い順 → 名前順。 */
function tokenOptions(g: ConsistencyGroup): TokenOption[] {
  const byId = new Map<string, TokenOption>();
  for (const c of g.cells) {
    if (!c.tokenId || !c.token) continue;
    const cur = byId.get(c.tokenId);
    if (cur) cur.count += 1;
    else byId.set(c.tokenId, { tokenId: c.tokenId, token: c.token, value: c.value, count: 1 });
  }
  return [...byId.values()].sort(
    (a, b) => b.count - a.count || (a.token < b.token ? -1 : 1),
  );
}

/** 比較軸 (free) の値だけを連結。1 行のラベルに使う。"Hover" / "Large / Compact"。 */
function freeLabel(cell: VariantCellSummary, freeAxes: string[]): string {
  const vals = freeAxes.map((a) => cell.axes[a] ?? '—');
  return vals.join(' / ') || '—';
}

/** 固定して見る軸 (gov) の値。"Primary · Enabled"。空 (全軸が比較軸) なら null。 */
function fixedLabel(g: ConsistencyGroup): string | null {
  const vals = Object.values(g.key).filter((v) => v !== '');
  return vals.length > 0 ? vals.join(' · ') : null;
}

/** 比較軸 (free) の宣言順でセルを並べ替え、ライン上で値が飛ばないようにする。 */
function orderCells(
  cells: VariantCellSummary[],
  freeAxes: string[],
  axisValues: Record<string, string[]>,
): VariantCellSummary[] {
  const pos = (axis: string, value: string): number => {
    const order = axisValues[axis];
    const i = order ? order.indexOf(value) : -1;
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...cells].sort((a, b) => {
    for (const axis of freeAxes) {
      const d = pos(axis, a.axes[axis] ?? '') - pos(axis, b.axes[axis] ?? '');
      if (d !== 0) return d;
    }
    return 0;
  });
}

/** 全プロパティの非 ambiguous 外れ値を期待トークンへまとめた fix 群 (「一括で修正」用)。 */
export function collectAllConsistencyFixes(report: ConsistencyReport): ConsistencyFix[] {
  return report.properties.flatMap((p) =>
    p.groups.flatMap((g) =>
      g.expected
        ? g.outliers.map((o) => ({ nodeId: o.nodeId, property: p.property, refId: g.expected!.tokenId }))
        : [],
    ),
  );
}

/**
 * トークンを表示する小ピル (TokenSelect/Select)。
 * - tone 'match': 揃っている行 (淡いグレー、選び直し不可)。
 * - tone 'diff' : 外れている行 (白枠 + バッジ + ネイティブ select で選び直し)。
 * - variant 'tag': 「に揃える」先を選ぶ小型タグ。
 */
function TokenPill({
  kind,
  tone,
  variant,
  token,
  value,
  options,
  selectedId,
  onSelect,
  ariaLabel,
}: {
  kind: 'color' | 'dimension';
  tone: 'match' | 'diff';
  variant: 'row' | 'tag';
  token: string | null;
  value: string | null;
  options?: TokenOption[];
  selectedId?: string;
  onSelect?: (tokenId: string) => void;
  ariaLabel?: string;
}) {
  const isHex = !!value && value.startsWith('#');
  const name = token ? shortName(token) : (value ?? '—');
  const interactive = !!options && !!onSelect;
  // 寸法は値バッジ (例 10)、色の外れは「?」バッジで「要確認」を示す。
  const badge = kind === 'dimension' ? value : tone === 'diff' ? '?' : null;

  return (
    <span
      className={`tokensel tokensel--${variant} tokensel--${tone}`}
    >
      <span
        className="tokensel__swatch"
        style={isHex ? { background: value! } : undefined}
        aria-hidden="true"
      />
      <span className="tokensel__name">{name}</span>
      {badge !== null && (
        <span className={`tokensel__badge tokensel__badge--${tone}`}>{badge}</span>
      )}
      {interactive && (
        <>
          <svg className="tokensel__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3.5 5l2.5 2.5L8.5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <select
            className="tokensel__native"
            value={selectedId}
            aria-label={ariaLabel}
            onChange={(e) => onSelect!(e.target.value)}
          >
            {options!.map((o) => (
              <option key={o.tokenId} value={o.tokenId}>
                {shortName(o.token)}
                {o.value && !o.value.startsWith('#') ? ` (${o.value})` : ''}
              </option>
            ))}
          </select>
        </>
      )}
    </span>
  );
}

function FindingCard({
  property,
  group,
  axisValues,
  busy,
  onApply,
}: {
  property: ConsistencyPropertyReport;
  group: ConsistencyGroup;
  axisValues: Record<string, string[]>;
  busy: boolean;
  onApply: (fixes: ConsistencyFix[]) => void;
}) {
  const options = tokenOptions(group);
  // 揃え先: 期待トークン (多数決) 既定。票割れ (expected=null) は最頻候補を初期選択。
  const defaultTarget = group.expected?.tokenId ?? options[0]?.tokenId ?? '';
  const [targetId, setTargetId] = useState(defaultTarget);
  // 行ごとの揃え先の上書き (外れ行のドロップダウンで個別に変えたとき)。
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const cells = orderCells(group.cells, property.freeAxes, axisValues);
  const target = options.find((o) => o.tokenId === targetId) ?? null;
  const fixed = fixedLabel(group);

  // そのカードの修正: 揃え先と違うセルを、行の上書き (なければ揃え先) へ寄せる。
  const cardFixes: ConsistencyFix[] = cells
    .map((c) => {
      const refId = overrides[c.nodeId] ?? targetId;
      return c.tokenId === refId ? null : { nodeId: c.nodeId, property: property.property, refId };
    })
    .filter((f): f is ConsistencyFix => f !== null && f.refId !== '');

  return (
    <section className="finding">
      <header className="finding__head">
        <div className="finding__heading">
          <p className="finding__title">
            {property.label}
            {fixed && <span className="finding__context">{fixed}</span>}
          </p>
          <div className="finding__target">
            <TokenPill
              kind={property.kind}
              tone="match"
              variant="tag"
              token={target?.token ?? null}
              value={target?.value ?? null}
              options={options}
              selectedId={targetId}
              onSelect={(id) => {
                setTargetId(id);
                setOverrides({});
              }}
              ariaLabel={`${property.label} の揃え先`}
            />
            <span className="finding__target-label">に揃える</span>
          </div>
        </div>
        <button
          type="button"
          className="finding__fix"
          disabled={busy || cardFixes.length === 0}
          onClick={() => onApply(cardFixes)}
        >
          修正
        </button>
      </header>

      <div className="finding__rows">
        {cells.map((c) => {
          const isOutlier = c.tokenId !== targetId;
          const selectedId = overrides[c.nodeId] ?? c.tokenId ?? '';
          const sel = options.find((o) => o.tokenId === selectedId) ?? null;
          return (
            <div
              key={c.nodeId}
              className={`finding__row${isOutlier ? ' finding__row--diff' : ''}`}
            >
              <span className="finding__rowlabel">{freeLabel(c, property.freeAxes)}</span>
              {isOutlier ? (
                <TokenPill
                  kind={property.kind}
                  tone="diff"
                  variant="row"
                  token={sel?.token ?? c.token}
                  value={sel?.value ?? c.value}
                  options={options}
                  selectedId={selectedId}
                  onSelect={(id) =>
                    setOverrides((prev) => ({ ...prev, [c.nodeId]: id }))
                  }
                  ariaLabel={`${freeLabel(c, property.freeAxes)} の揃え先`}
                />
              ) : (
                <TokenPill
                  kind={property.kind}
                  tone="match"
                  variant="row"
                  token={c.token}
                  value={c.value}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ConsistencyList({ report, busy, onApply }: ConsistencyListProps) {
  // 指摘 (プロパティ × グループ) を 1 列に並べる。
  const findings = report.properties.flatMap((p) =>
    p.groups.map((g) => ({ property: p, group: g })),
  );

  return (
    <div className="consistency">
      <div className="consistency__summary">
        <p className="consistency__set">{report.setName}</p>
        <p className="consistency__meta">
          {report.variantCount} バリアント · {report.axes.join(' × ') || '—'}
        </p>
        {findings.length > 0 && (
          <p className="consistency__counts">
            ⚠ {findings.length} 件の指摘
            {report.totalOutliers > 0 && ` · 直せる ${report.totalOutliers}`}
            {report.ambiguousCount > 0 && ` · 要確認 ${report.ambiguousCount}`}
          </p>
        )}
      </div>

      {findings.length === 0 ? (
        <p className="state consistency__ok">横断チェック: 不整合は見つかりませんでした 🎉</p>
      ) : (
        <div className="consistency__findings">
          {findings.map(({ property, group }, i) => (
            <FindingCard
              key={`${property.property}-${i}`}
              property={property}
              group={group}
              axisValues={report.axisValues}
              busy={busy}
              onApply={onApply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
