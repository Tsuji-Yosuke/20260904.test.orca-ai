import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  AnatomyShape,
  CheckRow,
  CheckSection,
  CheckStatus,
  ConsistencyReport,
  FillChip,
  InspectionPayload,
  InspectionPreview,
  InspectionResult,
} from '../../shared/messages';
import { emit, onMessage } from '../messaging';
import { TopAppBar } from '../components/TopAppBar';
import { FixDiffModal } from '../components/FixDiffModal';
import { BulkFixModal } from '../components/BulkFixModal';
import { InfoBar } from '../components/InfoBar';
import { IndexList } from '../components/IndexList';
import {
  ConsistencyList,
  collectAllConsistencyFixes,
  type ConsistencyFix,
} from '../components/ConsistencyList';
import { ConsistencyConfirmModal } from '../components/ConsistencyConfirmModal';

/**
 * チェックのモード。single = 1 ノード/複数選択の絶対チェック (Index) / consistency = バリアント間の
 * 横断チェック。タブは廃止し、複数選択の Index 下部「バリアント確認」から consistency に入る。
 */
type CheckMode = 'single' | 'consistency';

interface CheckScreenProps {
  /** ホームへ戻る。 */
  onBack: () => void;
}

/**
 * チェックデザイン画面 (デザイン 54:326)。選択中のコンポーネントが正しい System トークンを
 * 使っているか (実数指定になっていないか) を検査して一覧表示する。検査は選択に対して自動実行
 * され (selectionchange で追従)、下部の「適用」で NG 項目を正しいトークンへ自動修正する。
 */
export function CheckScreen({ onBack }: CheckScreenProps) {
  const [payload, setPayload] = useState<InspectionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- 複数選択 (Index) の UI 状態 ---
  // expanded=true で Index 一覧、false で選択中 1 件の詳細を表示する (インフォバーのトグル)。
  const [expanded, setExpanded] = useState(false);
  // collapsed 時に詳細を出すコンポーネントの index (Index 行クリックで切替)。
  const [selectedIndex, setSelectedIndex] = useState(0);
  // ドリルインした 1 件の詳細 (inspect-node の応答)。
  const [detail, setDetail] = useState<InspectionResult | null>(null);

  // --- 適用の状態 (単一: 詳細の「適用」 / 一括: Index の「一括で修正」) ---
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkConfirming, setBulkConfirming] = useState(false);

  // --- 横断チェック (機能5) の UI 状態 ---
  const [mode, setMode] = useState<CheckMode>('single');
  // 横断チェック結果。null = 選択がコンポーネントセットでない。未取得は loaded=false で区別。
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [consistencyLoaded, setConsistencyLoaded] = useState(false);
  const [aligning, setAligning] = useState(false);
  // 「すべて揃える」の確認モーダル表示。個別/グループの「揃える」は即時 (確認なし)。
  const [alignConfirming, setAlignConfirming] = useState(false);

  // 再検査 (inspection) で選択が変わったか判定するため、直近 payload を ref で保持する。
  const payloadRef = useRef<InspectionPayload | null>(null);
  payloadRef.current = payload;
  // selectionchange (= inspection 受信) のとき横断結果も更新するため、現在モードを ref で見る。
  const modeRef = useRef<CheckMode>(mode);
  modeRef.current = mode;
  // ドリルイン応答 (node-inspection) の取り違え防止 (要求中の id と違う古い応答は捨てる)。
  const pendingDetailIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      switch (message.type) {
        case 'inspection': {
          setError(null);
          // 再検査が来たら適用系の進行・確認は閉じる (適用完了 → 再検査の流れ)。
          setApplying(false);
          setBulkApplying(false);
          setConfirming(false);
          setBulkConfirming(false);
          const p = message.payload;
          if (p.status === 'multi') {
            const prev = payloadRef.current;
            const prevItems = prev?.status === 'multi' ? prev.items : [];
            const prevIds = prevItems.map((i) => i.nodeId).join('|');
            const newIds = p.items.map((i) => i.nodeId).join('|');
            if (prevIds !== newIds) {
              // 選択が変わった。新選択が旧選択の部分集合 (一括修正で残ったコンポーネントなど) なら
              // Index 表示を保ち、まったく別物を選び直したときだけ折りたたみ詳細に戻す。
              const prevSet = new Set(prevItems.map((i) => i.nodeId));
              const isSubset = p.items.length > 0 && p.items.every((it) => prevSet.has(it.nodeId));
              if (!isSubset) setExpanded(false);
              setSelectedIndex(0);
            }
            // 再検査が来たら詳細は一旦クリアし、最新の node-inspection を待つ。これをしないと
            // 適用直後に「修正前の古い fixes 付き詳細」が残り、適用ボタンが有効なままになる。
            // (collapsed の場合 detail 再取得 effect が新しい結果を取りに行く。)
            setDetail(null);
            pendingDetailIdRef.current = null;
          } else {
            // 単一 / 空 / 対象外 に戻ったら複数選択の状態は破棄する。
            setExpanded(false);
            setSelectedIndex(0);
            setDetail(null);
            pendingDetailIdRef.current = null;
          }
          setPayload(p);
          // 横断モード中は selectionchange (= この inspection) を機に横断結果も取り直す。
          if (modeRef.current === 'consistency') emit({ type: 'get-consistency' });
          break;
        }
        case 'node-inspection': {
          // 要求中の id と一致しない古い応答は捨てる (連続ドリルインの取り違え防止)。
          // result=null でもエコーされた message.nodeId で照合できるので、有効な詳細を
          // 古い null 応答で上書きしてしまう取りこぼしを防ぐ。
          if (pendingDetailIdRef.current && message.nodeId !== pendingDetailIdRef.current) break;
          setDetail(message.result);
          break;
        }
        case 'fixes-applied':
          // 通常は直後に inspection が来て閉じる。再入で弾かれた {0,0} は終端なのでここで解除。
          if (message.fixed === 0 && message.failed === 0) {
            setApplying(false);
            setConfirming(false);
          }
          break;
        case 'bulk-fixes-applied':
          if (message.fixed === 0 && message.failed === 0) {
            setBulkApplying(false);
            setBulkConfirming(false);
          }
          break;
        case 'consistency':
          setReport(message.report);
          setConsistencyLoaded(true);
          setAligning(false);
          setAlignConfirming(false);
          break;
        case 'consistency-applied':
          // 通常は直後に consistency が来て解除される。再入で弾かれた {0,0} は終端。
          if (message.fixed === 0 && message.failed === 0) setAligning(false);
          break;
        case 'error':
          setError(message.message);
          setApplying(false);
          setBulkApplying(false);
          setConfirming(false);
          setBulkConfirming(false);
          break;
        default:
          break; // 他画面向けメッセージは無視。
      }
    });
    // 画面を開いた瞬間に現在の選択を検査し、以降は selectionchange で自動追従する。
    emit({ type: 'set-inspecting', active: true });
    return () => {
      emit({ type: 'set-inspecting', active: false });
      unsubscribe();
    };
  }, []);

  const isMulti = payload?.status === 'multi';
  const items = payload?.status === 'multi' ? payload.items : [];
  const selectedItem = isMulti ? items[selectedIndex] : undefined;

  // collapsed (詳細) のとき、選択中 item の詳細を inspect-node で取りに行く。
  // payload (再検査) / expanded / selectedIndex の変化で再取得 → 適用後も最新に追従する。
  useEffect(() => {
    if (payload?.status !== 'multi' || expanded) return;
    const item = payload.items[selectedIndex];
    if (!item || !item.supported) {
      pendingDetailIdRef.current = null;
      return;
    }
    pendingDetailIdRef.current = item.nodeId;
    emit({ type: 'inspect-node', nodeId: item.nodeId });
  }, [payload, expanded, selectedIndex]);

  // 集計バッジ (検査可能な item のみ合算)。
  const totalPass = items.reduce((sum, it) => sum + (it.supported ? it.pass : 0), 0);
  const totalFail = items.reduce((sum, it) => sum + (it.supported ? it.fail : 0), 0);
  // 一括修正の対象 (fix を持つ item) と合計件数。
  const bulkTargets = items.filter((it) => it.supported && it.fixCount > 0);
  const bulkChanges = bulkTargets.reduce((sum, it) => sum + it.fixCount, 0);

  // 表示中の詳細結果 = 単一なら payload.result、複数 collapsed なら選択行に一致した detail。
  const detailMatches = !!detail && detail.nodeId === selectedItem?.nodeId;
  const detailResult: InspectionResult | null =
    payload?.status === 'ok'
      ? payload.result
      : isMulti && !expanded && detailMatches
        ? detail
        : null;
  const singleHasFixes = !!detailResult && detailResult.fixes.length > 0;

  // フッターは「Index を開いているとき = 一括で修正」「それ以外 = 適用 (詳細 1 件)」。
  const showBulk = isMulti && expanded;

  // 適用ボタン: まず確認モーダルを開く (即時には変更しない)。
  const onApply = () => {
    if (!singleHasFixes) return;
    setConfirming(true);
  };
  const confirmApply = (choices: Record<string, string>) => {
    if (!detailResult) return;
    setApplying(true);
    emit({ type: 'apply-fixes', nodeId: detailResult.nodeId, choices });
  };
  const onBulkApply = () => {
    if (bulkTargets.length === 0) return;
    setBulkConfirming(true);
  };
  const confirmBulkApply = () => {
    if (bulkTargets.length === 0) return;
    setBulkApplying(true);
    emit({ type: 'apply-fixes-bulk', nodeIds: bulkTargets.map((it) => it.nodeId) });
  };

  const refresh = () => {
    setConfirming(false);
    setBulkConfirming(false);
    setPayload(null);
    setDetail(null);
    pendingDetailIdRef.current = null;
    emit({ type: 'set-inspecting', active: true });
  };

  // Index 行クリック → その行へドリルイン (詳細表示へ折りたたむ)。
  const openRow = (i: number) => {
    setSelectedIndex(i);
    setExpanded(false);
  };

  // 横断モードに切り替えたら結果を取りに行く (以降は selectionchange で追従)。
  useEffect(() => {
    if (mode !== 'consistency') return;
    setConsistencyLoaded(false);
    setReport(null);
    emit({ type: 'get-consistency' });
  }, [mode]);

  const refreshConsistency = () => {
    setConsistencyLoaded(false);
    setReport(null);
    emit({ type: 'get-consistency' });
  };

  const alignAllFixes = report ? collectAllConsistencyFixes(report) : [];
  const onAlign = (fixes: ConsistencyFix[]) => {
    if (fixes.length === 0) return;
    setAligning(true);
    emit({ type: 'apply-consistency-fixes', fixes });
  };

  // 横断チェック中の「戻る」は Index へ (タブが無いので戻りで single に復帰)。それ以外はホームへ。
  const onBackOrExitConsistency = mode === 'consistency' ? () => setMode('single') : onBack;

  return (
    <div className="screen">
      <TopAppBar
        title={mode === 'consistency' ? 'バリアントでの横断確認' : 'Variablesの確認'}
        onBack={onBackOrExitConsistency}
        onReset={mode === 'consistency' ? refreshConsistency : refresh}
        resetLabel="再検査"
      />

      {mode === 'single' && isMulti && (
        <InfoBar
          count={items.length}
          pass={totalPass}
          fail={totalFail}
          expanded={expanded}
          onToggle={() => setExpanded((e) => !e)}
        />
      )}

      {error && (
        <p className="state state--error app__error" role="alert">
          ⚠️ {error}
        </p>
      )}

      {mode === 'consistency' ? (
        <>
          {!consistencyLoaded ? (
            <div className="screen__body check">
              <p className="state">検査中…</p>
            </div>
          ) : report === null ? (
            <div className="screen__body check">
              <p className="state check__placeholder">
                コンポーネントセット（バリアントの集合）を選択してください。
              </p>
            </div>
          ) : (
            <div className="screen__body">
              <ConsistencyList report={report} busy={aligning} onApply={onAlign} />
            </div>
          )}
          <footer className="footer">
            <button
              type="button"
              className="footer__apply"
              disabled={aligning || alignAllFixes.length === 0}
              onClick={() => setAlignConfirming(true)}
            >
              {aligning
                ? '修正中…'
                : alignAllFixes.length > 0
                  ? `一括で修正 (${alignAllFixes.length})`
                  : '不整合なし'}
            </button>
          </footer>

          {alignConfirming && (
            <ConsistencyConfirmModal
              count={alignAllFixes.length}
              busy={aligning}
              onCancel={() => setAlignConfirming(false)}
              onConfirm={() => onAlign(alignAllFixes)}
            />
          )}
        </>
      ) : (
        <>
          {payload === null ? (
            <div className="screen__body check">
              <p className="state">検査中…</p>
            </div>
          ) : payload.status === 'empty' ? (
            <div className="screen__body check">
              <p className="state check__placeholder">検査したいコンポーネントを選択してください。</p>
            </div>
          ) : payload.status === 'unsupported' ? (
            <div className="screen__body check">
              <p className="state check__placeholder">「{payload.nodeName}」は検査できないノードです。</p>
            </div>
          ) : payload.status === 'ok' ? (
            <div className="screen__body check">
              <CheckDetailBody key={payload.result.nodeId} result={payload.result} />
            </div>
          ) : expanded ? (
            <div className="screen__body">
              <IndexList items={payload.items} onOpen={openRow} />
            </div>
          ) : selectedItem && !selectedItem.supported ? (
            <div className="screen__body check">
              <p className="state check__placeholder">このコンポーネントは検査できません。</p>
            </div>
          ) : detailResult ? (
            <div className="screen__body check">
              <CheckDetailBody key={detailResult.nodeId} result={detailResult} />
            </div>
          ) : (
            <div className="screen__body check">
              <p className="state">検査中…</p>
            </div>
          )}

          <footer className="footer">
            {showBulk ? (
              <>
                {/* 横断チェック (バリアント間の一貫性) への入口。 */}
                <button
                  type="button"
                  className="footer__secondary"
                  onClick={() => setMode('consistency')}
                >
                  バリアント確認
                </button>
                <button
                  type="button"
                  className="footer__apply"
                  disabled={bulkTargets.length === 0 || bulkApplying}
                  onClick={onBulkApply}
                >
                  {bulkApplying ? '修正中…' : '一括で修正'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="footer__apply"
                disabled={!singleHasFixes || applying}
                onClick={onApply}
              >
                {applying ? '修正中…' : '適用'}
              </button>
            )}
          </footer>

          {confirming && detailResult && (
            <FixDiffModal
              diffs={detailResult.fixes}
              busy={applying}
              onCancel={() => setConfirming(false)}
              onConfirm={confirmApply}
            />
          )}

          {bulkConfirming && (
            <BulkFixModal
              components={bulkTargets.length}
              changes={bulkChanges}
              busy={bulkApplying}
              onCancel={() => setBulkConfirming(false)}
              onConfirm={confirmBulkApply}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * 検査詳細の本文 (プレビュー + 名前/説明 + Dimension/Color セクション)。単一選択と、複数選択で
 * 1 件にドリルインしたときの両方で共用する。行 hover でプレビューの該当アナトミーを強調する。
 * 表示対象が切り替わったら hover 状態を捨てたいので、呼び出し側で key={result.nodeId} を渡す。
 */
function CheckDetailBody({ result }: { result: InspectionResult }) {
  const [hoveredN, setHoveredN] = useState<number | null>(null);
  return (
    <>
      <PreviewBox
        preview={result.preview}
        regions={collectRegions(result.sections)}
        highlightN={hoveredN}
      />
      <div className="check__info">
        <p className="check__name">{result.name}</p>
        <p className="check__desc">{result.description}</p>
      </div>
      {result.sections.map((section) => (
        <SectionView key={section.id} section={section} onHover={setHoveredN} />
      ))}
    </>
  );
}

/** Dimension / Color の色分け (検査リスト行頭の番号バッジに使う)。 */
const ANATOMY_COLORS: Record<'dimension' | 'color', string> = {
  dimension: '#0d99ff',
  color: '#9747ff',
};

/**
 * プレビュー上に出す 1 部位 (検査行 ↔ 目印)。帯/チップの状態色とチップ表示は、この行データ
 * (status / chip / swatch) から決まる。検査ロジック (inspect.ts) はそのままで、見せ方だけを担う。
 */
interface Region {
  /** React key 用の一意キー (Margin など 1 行が複数領域を持つので rowId だけだと衝突する)。 */
  key: string;
  rowId: string;
  /** 検査行と対応づける通し番号 (リスト行頭バッジと一致)。複数領域 (gap) では同じ番号を共有。 */
  n: number;
  group: 'dimension' | 'color';
  /** pass = 正しいトークン / fail = 実数 or 誤トークン (na 行は marker を持たないので来ない)。 */
  status: 'pass' | 'fail';
  /** チップに出すトークン短縮名 (chip の末尾セグメント)。 */
  label: string;
  /** Color 行 (Bg / On) のスウォッチ色 hex。 */
  swatch?: string;
  shape: AnatomyShape;
}

/**
 * 検査行から、目印を持つ行だけを Region に変換する (na 行は marker 無しで自然に除外)。
 * Margin (gap) のように 1 行が複数領域を指す場合は shape + extraShapes を 1 領域ずつ展開する
 * (番号・状態・ラベルは共有し、key だけ別にする)。
 */
export function collectRegions(sections: CheckSection[]): Region[] {
  const regions: Region[] = [];
  for (const section of sections) {
    for (const row of section.rows) {
      const marker = row.marker;
      if (!marker) continue;
      const shapes = [marker.shape, ...(marker.extraShapes ?? [])];
      const base = {
        rowId: row.id,
        n: marker.n,
        group: marker.group,
        status: (row.status === 'fail' ? 'fail' : 'pass') as 'pass' | 'fail',
        label: leafLabel(row.chip),
        swatch: row.swatch ?? (row.chip.startsWith('#') ? row.chip : undefined),
      };
      shapes.forEach((shape, i) => {
        regions.push({ ...base, key: `${row.id}#${i}`, shape });
      });
    }
  }
  return regions;
}

/** "Dimension System/Spacing/Padding/lg" → "lg" (スラッシュ区切りの末尾)。 */
function leafLabel(name: string): string {
  const segs = name.split('/');
  return segs[segs.length - 1] || name;
}

/**
 * hover 中 = その番号だけ強調・他をディム。強調色は対象の状態で変える: 正しいトークンが入って
 * いる (pass) なら緑 (hover)、トークン未指定/誤り (fail) なら緑にせずエラーカラー (hoverFail)。
 * 非 hover 時は pass/fail で色を決める。
 */
type VisState = 'default' | 'fail' | 'hover' | 'hoverFail' | 'dim';

function visStateOf(region: Region, highlightN: number | null): VisState {
  if (highlightN !== null) {
    if (highlightN === region.n) return region.status === 'fail' ? 'hoverFail' : 'hover';
    return 'dim';
  }
  return region.status === 'fail' ? 'fail' : 'default';
}

/** 計測した画像矩形 (プレビュー左上基準のピクセル) + プレビュー全体サイズ。 */
interface PreviewLayout {
  pw: number;
  ph: number;
  img: { left: number; top: number; width: number; height: number };
}

interface BandRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * チップ (バッジ) は必ずプレビュー枠の外周ガター (セーフエリアの外側) に置く。枠端から
 * CHIP_SAFE(=10px) を担保し、コンポーネントや帯には重ねない。
 */
const CHIP_SAFE = 10;

/**
 * チップの固定位置。
 * - 枠の 4 辺 (left/right/top/bottom): CHIP_SAFE で枠端に貼り付け、cross でもう一方の軸を合わせる
 *   (left/right は cross = 縦位置 y、top/bottom は cross = 横位置 x)。
 * - center: 任意の点 (x, y) に中心を合わせる (Height の矢印センターに乗せる等)。
 */
type ChipAnchor =
  | { edge: 'left' | 'right' | 'top' | 'bottom'; cross: number }
  | { edge: 'center'; x: number; y: number };

/**
 * 配置済みの 1 部位。種別ごとに描き方が違う:
 * - band   : padding / margin の領域を示す半透明の帯 (Canvas を横断するルーラー風)。
 * - height : 上下の破線 + 右の縦両矢印。
 * - radius : 角のアーク + 曲線矢印。
 * - color  : 右上の Bg / On スウォッチチップ。
 * chip は枠端に貼るバッジの固定位置。
 */
type Placement =
  // band は厚み 0 (値 none/0) のとき null = 塗りを描かずバッジだけ残す。
  | { kind: 'band'; region: Region; band: BandRect | null; chip: ChipAnchor }
  | { kind: 'height'; region: Region; yTop: number; yBot: number; xArrow: number; chip: ChipAnchor }
  | { kind: 'radius'; region: Region; cx: number; cy: number; r: number; chip: ChipAnchor }
  // color は 1 行が複数オーバーレイ (On がアイコン+ラベル等の複数要素) になり得る。チップは
  // 行に 1 つだけにしたいので、最初の領域だけ showChip=true にして他はオーバーレイのみ描く。
  | { kind: 'color'; region: Region; chip: ChipAnchor; showChip: boolean };

/**
 * 1D で重ならないよう配置する。希望座標 (帯の中心) になるべく近づけつつ、最小間隔 gap を
 * 保ち [min, max] に収める。戻り値は元配列を希望座標昇順に並べ、割当座標 coord を添えたもの。
 */
function spreadCoords<T>(
  arr: T[],
  want: (m: T) => number,
  min: number,
  max: number,
  gap: number,
): Array<{ m: T; coord: number }> {
  const sorted = [...arr].sort((a, b) => want(a) - want(b));
  const coords: number[] = [];
  let prev = -Infinity;
  for (const m of sorted) {
    let c = Math.min(Math.max(want(m), min), max);
    if (c < prev + gap) c = prev + gap;
    coords.push(c);
    prev = c;
  }
  // はみ出したら上から詰め直す。詰めても下限 (min) は割らない (枠外へ出さない)。
  let next = Infinity;
  for (let i = sorted.length - 1; i >= 0; i--) {
    let c = coords[i] ?? min;
    if (c > max) c = max;
    if (c > next - gap) c = next - gap;
    if (c < min) c = min;
    coords[i] = c;
    next = c;
  }
  return sorted.map((m, i) => ({ m, coord: coords[i] ?? min }));
}

/**
 * 各部位を「帯 + 辺沿いチップ」に配置する (デザイン 93:755 のアナトミー図)。
 * padding/margin は span の向きで横帯 (→ 左辺にチップ) / 縦帯 (→ 下辺にチップ) を決め、
 * Height は右辺、Radius は左上角、Color (Bg/On) は右上にまとめる。同じ辺のチップは
 * 帯の中心へ寄せつつ最小間隔で並べる (重なり回避)。
 */
function layoutRegions(regions: Region[], layout: PreviewLayout): Placement[] {
  const { pw, ph, img } = layout;
  const X = (n: number) => img.left + n * img.width;
  const Y = (n: number) => img.top + n * img.height;
  // 枠端 CHIP_SAFE を担保した可動範囲 (チップ半幅/半高ぶんも内側へ寄せる)。
  const yMin = CHIP_SAFE + 9;
  const yMax = ph - CHIP_SAFE - 9;
  const xMin = CHIP_SAFE + 16;
  const xMax = pw - CHIP_SAFE - 16;
  const clampY = (y: number) => Math.min(yMax, Math.max(yMin, y));
  const clampX = (x: number) => Math.min(xMax, Math.max(xMin, x));

  const out: Placement[] = [];
  // 辺ごとにチップ位置を後でまとめて決めるための一時リスト (帯の中心 = want)。
  const leftEdge: Array<{ p: Placement; want: number }> = []; // 横帯 → 左辺
  const bottomEdge: Array<{ p: Placement; want: number }> = []; // 縦帯 → 下辺
  const colorPs: Placement[] = [];
  // Color 行 (Bg/On) は複数オーバーレイになり得るので、チップは行ごとに 1 回だけ出す。
  const colorChipShown = new Set<string>();

  for (const region of regions) {
    const s = region.shape;
    if (region.rowId === 'color.background' || region.rowId === 'color.on') {
      // 同じ行の 2 個目以降の領域はオーバーレイだけ描き、チップは出さない (重複防止)。
      const showChip = !colorChipShown.has(region.rowId);
      colorChipShown.add(region.rowId);
      const p: Placement = { kind: 'color', region, chip: { edge: 'top', cross: 0 }, showChip };
      if (showChip) colorPs.push(p); // チップ位置決め (右上の並べ替え) は代表領域だけ対象にする。
      out.push(p);
      continue;
    }
    if (region.rowId === 'dimension.height') {
      // 縦両矢印 + バッジのグループをコンポーネント右端から 10px 離す。バッジは矢印センターに
      // 乗せるので、バッジ幅の見積りぶん矢印を右へずらし、バッジ左端が本体から ~10px になるよう
      // にする (Geist Mono 10px の概算幅。実測しないぶん多少の誤差は許容)。
      const estW = Math.max(18, region.label.length * 6.2 + 12);
      const xArrow = Math.min(pw - CHIP_SAFE - estW / 2, X(1) + 10 + estW / 2);
      const p: Placement = {
        kind: 'height', region, yTop: Y(0), yBot: Y(1), xArrow,
        chip: { edge: 'center', x: xArrow, y: clampY((Y(0) + Y(1)) / 2) },
      };
      out.push(p);
      continue;
    }
    if (region.rowId === 'dimension.radius') {
      const r = s.kind === 'circle' ? Math.max(5, s.r * img.width) : 8;
      const cx = X(0);
      const cy = Y(0);
      // バッジは角丸 (cx,cy) から左上 45° (対角) に置く。セーフエリア内に収まる範囲で対角に下げる
      // (上端・左端の余白の小さい方に合わせて 45° を保つ。最大 34px)。
      const halfW = Math.max(14, region.label.length * 3.1 + 8);
      const off = Math.max(0, Math.min(cx - (CHIP_SAFE + halfW), cy - (CHIP_SAFE + 9), 34));
      const p: Placement = {
        kind: 'radius', region, cx, cy, r,
        chip: { edge: 'center', x: cx - off, y: cy - off },
      };
      out.push(p);
      continue;
    }
    // padding / margin → 帯。padding は rowId で向き・密着辺が決まる (値 0 でも向きが定まる)。
    // gap は span の長辺で向きを判定する。厚み 0 (none) のときは塗りを出さず (band=null) バッジだけ残す。
    if (s.kind !== 'span') continue;
    const isTop = region.rowId === 'dimension.paddingTop';
    const isBottom = region.rowId === 'dimension.paddingBottom';
    const isLeft = region.rowId === 'dimension.paddingLeft';
    const isRight = region.rowId === 'dimension.paddingRight';
    const horizontalBand =
      isTop || isBottom
        ? true
        : isLeft || isRight
          ? false
          : Math.abs(s.y2 - s.y1) >= Math.abs(s.x2 - s.x1); // gap
    if (horizontalBand) {
      // 横帯 (全幅), 縦方向の厚み。padding は外側辺をコンポーネント端 (0/1) にスナップ。
      let n1 = Math.min(s.y1, s.y2);
      let n2 = Math.max(s.y1, s.y2);
      if (isTop) n1 = 0;
      if (isBottom) n2 = 1;
      const yt = Y(n1);
      const yb = Y(n2);
      const band = n2 - n1 > 0.001 ? { left: 0, top: yt, width: pw, height: yb - yt } : null;
      const p: Placement = { kind: 'band', region, band, chip: { edge: 'left', cross: 0 } };
      leftEdge.push({ p, want: (yt + yb) / 2 });
      out.push(p);
    } else {
      // 縦帯 (全高), 横方向の厚み。
      let n1 = Math.min(s.x1, s.x2);
      let n2 = Math.max(s.x1, s.x2);
      if (isLeft) n1 = 0;
      if (isRight) n2 = 1;
      const xl = X(n1);
      const xr = X(n2);
      const band = n2 - n1 > 0.001 ? { left: xl, top: 0, width: xr - xl, height: ph } : null;
      const p: Placement = { kind: 'band', region, band, chip: { edge: 'bottom', cross: 0 } };
      bottomEdge.push({ p, want: (xl + xr) / 2 });
      out.push(p);
    }
  }

  // 左辺チップ: 帯中心の y に寄せて縦に並べる (枠左端 10px 固定)。
  for (const { m, coord } of spreadCoords(leftEdge, (it) => it.want, yMin, yMax, 22)) {
    m.p.chip = { edge: 'left', cross: coord };
  }
  // 下辺チップ: 帯中心の x に寄せて横に並べる (枠下端 10px 固定)。
  for (const { m, coord } of spreadCoords(bottomEdge, (it) => it.want, xMin, xMax, 34)) {
    m.p.chip = { edge: 'bottom', cross: coord };
  }
  // Color チップ (Bg → On) を上ガターの右側へ右詰めで並べる。
  const ordered = [...colorPs].sort((a, b) => (a.region.rowId < b.region.rowId ? -1 : 1));
  let rx = xMax;
  for (let i = ordered.length - 1; i >= 0; i--) {
    ordered[i]!.chip = { edge: 'top', cross: clampX(rx) };
    rx -= 52;
  }
  return out;
}

/** 線画 (Radius / Height) の状態別アクセント色。帯・チップとは別に細線用の濃さに調整。 */
const LINE_ACCENT: Record<'radius' | 'height', Record<VisState, string>> = {
  radius: { default: '#0d99ff', fail: '#dd500e', hover: '#5bbf0b', hoverFail: '#dd500e', dim: 'rgba(0,0,0,0.18)' },
  height: { default: '#6b6b6b', fail: '#dd500e', hover: '#5bbf0b', hoverFail: '#dd500e', dim: 'rgba(0,0,0,0.18)' },
};

/** 線画の矢印先 (状態×種別)。色は LINE_ACCENT と揃える。 */
function arrowMarker(kind: 'radius' | 'height', state: VisState): string {
  if (state === 'fail' || state === 'hoverFail') return 'ah-orange';
  if (state === 'hover') return 'ah-green';
  if (state === 'dim') return 'ah-dim';
  return kind === 'radius' ? 'ah-blue' : 'ah-gray';
}

/** チップの固定スタイル。枠端 CHIP_SAFE に貼り付け、もう一方の軸は cross で中心合わせ。 */
function chipStyle(chip: ChipAnchor): CSSProperties {
  switch (chip.edge) {
    case 'left':
      return { left: CHIP_SAFE, top: chip.cross, transform: 'translateY(-50%)' };
    case 'right':
      return { right: CHIP_SAFE, top: chip.cross, transform: 'translateY(-50%)' };
    case 'top':
      return { top: CHIP_SAFE, left: chip.cross, transform: 'translateX(-50%)' };
    case 'bottom':
      return { bottom: CHIP_SAFE, left: chip.cross, transform: 'translateX(-50%)' };
    case 'center':
      return { left: chip.x, top: chip.y, transform: 'translate(-50%, -50%)' };
  }
}

/** チップ 1 つ (短縮名ピル / Bg・On スウォッチ / 失敗の「?」丸)。枠端ガターに固定。 */
function RegionChip({ placement, state }: { placement: Placement; state: VisState }) {
  const { region, chip } = placement;
  const style = chipStyle(chip);
  // チップの見た目は hoverFail も fail と同じ (オレンジ/「?」)。緑化させず、帯だけエラー色で強調する。
  const s: VisState = state === 'hoverFail' ? 'fail' : state;
  if (placement.kind === 'color') {
    // アクティブ (hover) のバッジは緑塗り + 白スウォッチ。通常は実色スウォッチを出す。
    const swatchBg = s === 'hover' ? '#ffffff' : (region.swatch ?? '#ffffff');
    return (
      <span className={`anatomy-chip anatomy-chip--swatch anatomy-chip--${s}`} style={style} aria-hidden="true">
        <span className="anatomy-chip__label">{region.rowId === 'color.background' ? 'Bg' : 'On'}</span>
        <span className="anatomy-chip__swatch" style={{ background: swatchBg }} />
      </span>
    );
  }
  // 非システムトークン (fail) は状態によらず常にオレンジの「?」丸バッジ (実数は出さない)。
  // 他行 hover で薄くする (dim) ときだけ淡くする。
  if (region.status === 'fail') {
    const faint = state === 'dim' ? ' anatomy-chip--faint' : '';
    return (
      <span className={`anatomy-chip anatomy-chip--fail${faint}`} style={style} aria-hidden="true">
        ?
      </span>
    );
  }
  return (
    <span className={`anatomy-chip anatomy-chip--${s}`} style={style} aria-hidden="true">
      {region.label}
    </span>
  );
}

/**
 * 選択ノードのプレビュー。ドット背景の上に実コンポーネントの PNG を中央表示し、計測した
 * 描画矩形を基準に padding/margin を半透明の帯 (Rectangle) で、Radius を角のアーク + 曲線矢印で、
 * Height を上下の破線 + 縦両矢印で示す。各部位には短縮名チップ (Bg/On は色スウォッチ) を辺沿いに
 * 置き、検査行の hover でその部位を緑強調・他をディムする (デザイン 93:755 のアナトミー図)。
 */
export function PreviewBox({
  preview,
  regions,
  highlightN,
}: {
  preview: InspectionPreview | null;
  regions: Region[];
  /** この番号の部位だけ強調し、他を薄くする (行 hover 連動)。null で全て通常表示。 */
  highlightN: number | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [layout, setLayout] = useState<PreviewLayout | null>(null);

  useEffect(() => {
    if (!preview || preview.bytes.length === 0) {
      setUrl(null);
      return;
    }
    // Uint8Array をそのまま Blob に渡すと lib の ArrayBufferLike 型でつまずくため、
    // 明示的に ArrayBuffer へコピーしてから Blob を作る。
    const buffer = new ArrayBuffer(preview.bytes.byteLength);
    new Uint8Array(buffer).set(preview.bytes);
    const objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [preview]);

  // 実際に描画された画像矩形を計測し、effect 余白を除いた実ジオメトリ矩形を layout.img とする
  // (content があれば画像内の本体サブ矩形。無ければ画像全体)。目印はこの本体基準で描く。
  const measure = useCallback(() => {
    const p = previewRef.current;
    const im = imgRef.current;
    if (!p || !im) return;
    const pr = p.getBoundingClientRect();
    const ir = im.getBoundingClientRect();
    if (ir.width === 0 || ir.height === 0) {
      setLayout(null);
      return;
    }
    const imLeft = ir.left - pr.left;
    const imTop = ir.top - pr.top;
    const c = preview?.content;
    setLayout({
      pw: pr.width,
      ph: pr.height,
      img: {
        left: imLeft + (c ? c.x * ir.width : 0),
        top: imTop + (c ? c.y * ir.height : 0),
        width: (c ? c.w : 1) * ir.width,
        height: (c ? c.h : 1) * ir.height,
      },
    });
  }, [preview]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (previewRef.current) ro.observe(previewRef.current);
    return () => ro.disconnect();
  }, [measure, url]);

  const placed = layout ? layoutRegions(regions, layout) : [];
  const lineArt = placed.filter((p) => p.kind === 'height' || p.kind === 'radius');

  return (
    <div className="check__preview" ref={previewRef}>
      {url ? (
        <>
          <div className="check__preview-stage">
            <img
              ref={imgRef}
              className="check__preview-img"
              src={url}
              alt="選択中コンポーネントのプレビュー"
              draggable={false}
              onLoad={measure}
              // 実寸より拡大せず、ステージ (中央領域) を超えるなら 100% に収める (contain)。
              style={
                preview
                  ? {
                      maxWidth: `min(100%, ${preview.width}px)`,
                      maxHeight: `min(100%, ${preview.height}px)`,
                    }
                  : undefined
              }
            />
          </div>

          {/* padding / margin の帯 (半透明 Rectangle)。値 0 (band=null) は塗らない。 */}
          {placed.map((p) =>
            p.kind === 'band' && p.band ? (
              <div
                key={`band-${p.region.key}`}
                className={`anatomy-band anatomy-band--${visStateOf(p.region, highlightN)}`}
                style={{
                  left: `${p.band.left}px`,
                  top: `${p.band.top}px`,
                  width: `${p.band.width}px`,
                  height: `${p.band.height}px`,
                }}
                aria-hidden="true"
              />
            ) : null,
          )}

          {/* Color オーバーレイ (Bg = コンポーネント塗り全体 / On = 中身の包含矩形)。ホバー中のみ。 */}
          {layout &&
            placed.map((p) => {
              if (p.kind !== 'color') return null;
              const state = visStateOf(p.region, highlightN);
              if (state !== 'hover' && state !== 'hoverFail') return null;
              const s = p.region.shape;
              if (s.kind !== 'rect') return null;
              const { img } = layout;
              return (
                <div
                  key={`ov-${p.region.key}`}
                  className="anatomy-overlay"
                  style={{
                    left: `${img.left + s.x * img.width}px`,
                    top: `${img.top + s.y * img.height}px`,
                    width: `${s.w * img.width}px`,
                    height: `${s.h * img.height}px`,
                    background: state === 'hoverFail' ? '#dd500e' : '#68d70d',
                    borderRadius: `${(s.r ?? 0) * img.width}px`,
                  }}
                  aria-hidden="true"
                />
              );
            })}

          {/* 線画: Height (破線 + 縦両矢印) / Radius (アーク + 曲線矢印)。 */}
          {layout && lineArt.length > 0 && (
            <svg
              className="check__preview-overlay"
              width={layout.pw}
              height={layout.ph}
              aria-hidden="true"
            >
              <defs>
                {(
                  [
                    ['ah-blue', '#0d99ff'],
                    ['ah-gray', '#6b6b6b'],
                    ['ah-orange', '#dd500e'],
                    ['ah-green', '#5bbf0b'],
                    ['ah-dim', 'rgba(0,0,0,0.2)'],
                  ] as const
                ).map(([id, fill]) => (
                  <marker
                    key={id}
                    id={id}
                    viewBox="0 0 8 8"
                    markerWidth="6"
                    markerHeight="6"
                    refX="4"
                    refY="4"
                    orient="auto-start-reverse"
                  >
                    <path d="M1 1 L7 4 L1 7 Z" fill={fill} />
                  </marker>
                ))}
              </defs>
              {lineArt.map((p) => {
                const state = visStateOf(p.region, highlightN);
                if (p.kind === 'height') {
                  const accent = LINE_ACCENT.height[state];
                  const marker = `url(#${arrowMarker('height', state)})`;
                  const lineColor = state === 'dim' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.22)';
                  return (
                    <g key={`line-${p.region.key}`}>
                      <line x1={0} y1={p.yTop} x2={layout.pw} y2={p.yTop} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
                      <line x1={0} y1={p.yBot} x2={layout.pw} y2={p.yBot} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
                      <line
                        x1={p.xArrow}
                        y1={p.yTop + 1}
                        x2={p.xArrow}
                        y2={p.yBot - 1}
                        stroke={accent}
                        strokeWidth={1.25}
                        markerStart={marker}
                        markerEnd={marker}
                      />
                    </g>
                  );
                }
                // radius: 角のアーク (accent。本体上でも見えるよう青系のまま) + バッジ→角の直線矢印。
                // 矢印の色は Component Height の矢印と同じ (LINE_ACCENT.height)。
                const arcColor = LINE_ACCENT.radius[state];
                const arrowColor = LINE_ACCENT.height[state];
                const marker = `url(#${arrowMarker('height', state)})`;
                const arc = `M ${p.cx} ${p.cy + p.r} A ${p.r} ${p.r} 0 0 1 ${p.cx + p.r} ${p.cy}`;
                // 矢印は左上 45°。先端は角丸アーク (角から ~0.414r) の 8px 手前で止める。
                const u = Math.SQRT1_2; // (1,1)/√2 の各成分
                const tipDist = 0.414 * p.r - 8;
                const tx = p.cx + tipDist * u;
                const ty = p.cy + tipDist * u;
                // 始点 = バッジ中心 (左上 45°)。
                const sx = p.chip.edge === 'center' ? p.chip.x : p.chip.cross;
                const sy = p.chip.edge === 'center' ? p.chip.y : CHIP_SAFE + 9;
                return (
                  <g key={`line-${p.region.key}`}>
                    <path d={arc} stroke={arcColor} strokeWidth={4} fill="none" strokeLinecap="round" />
                    <line x1={sx} y1={sy} x2={tx} y2={ty} stroke={arrowColor} strokeWidth={1.25} markerEnd={marker} />
                  </g>
                );
              })}
            </svg>
          )}

          {/* 部位ラベル (チップ)。color の複数オーバーレイは代表領域だけがチップを出す。 */}
          {placed.map((p) =>
            p.kind === 'color' && !p.showChip ? null : (
              <RegionChip key={`chip-${p.region.key}`} placement={p} state={visStateOf(p.region, highlightN)} />
            ),
          )}
        </>
      ) : (
        <span className="check__preview-empty">プレビューなし</span>
      )}
    </div>
  );
}

/** 検査セクション (Dimension / Color)。 */
function SectionView({
  section,
  onHover,
}: {
  section: CheckSection;
  onHover: (n: number | null) => void;
}) {
  return (
    <section className="check-section">
      <h3 className="check-section__title">{section.title}</h3>
      <div className="check-section__rows">
        {section.rows.map((row) => (
          <RowView key={row.id} row={row} onHover={onHover} />
        ))}
      </div>
    </section>
  );
}

/** 検査 1 行 (ステータスバッジ + アナトミー番号 + ラベル + 現在内容チップ)。hover で対応目印を強調。 */
function RowView({ row, onHover }: { row: CheckRow; onHover: (n: number | null) => void }) {
  return (
    <div
      className="check-row"
      onMouseEnter={() => onHover(row.marker?.n ?? null)}
      onMouseLeave={() => onHover(null)}
    >
      <StatusBadge status={row.status} />
      <div className="check-row__main">
        <p className="check-row__label">
          {row.marker && (
            <span className="anatomy-num" style={{ background: ANATOMY_COLORS[row.marker.group] }}>
              {row.marker.n}
            </span>
          )}
          {row.label}
        </p>
        {row.fills && row.fills.length > 0 ? (
          <FillChips fills={row.fills} title={row.detail} />
        ) : (
          <span className="check-row__chip" title={row.detail}>
            {row.chip}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Background が複数 fill (地色 + StateLayers オーバーレイ) を持つときの内訳チップ。
 * 役割別に「地色チップ + + + オーバーレイチップ」を 1 行に並べ、各チップは状態 (pass/fail/na) で
 * 色付けし、トークンのスウォッチ色を小さなドットで添える。
 */
function FillChips({ fills, title }: { fills: FillChip[]; title?: string }) {
  return (
    <span className="check-row__fills" title={title}>
      {fills.map((f, i) => (
        <Fragment key={`${f.role}-${i}`}>
          {i > 0 && (
            <span className="check-row__fill-plus" aria-hidden="true">
              +
            </span>
          )}
          <span className={`check-row__chip check-row__chip--fill check-row__chip--${f.status}`}>
            {f.swatch && (
              <span className="check-row__chip-swatch" style={{ background: f.swatch }} aria-hidden="true" />
            )}
            {f.chip}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/** 合否バッジ。pass=緑チェック / fail=橙クエスチョン / na=灰ダッシュ。 */
function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === 'pass') {
    return (
      <span className="status-badge status-badge--pass" aria-label="OK">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M3 7.3 5.6 10 11 4"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === 'fail') {
    return (
      <span className="status-badge status-badge--fail" aria-label="要確認">
        ?
      </span>
    );
  }
  return (
    <span className="status-badge status-badge--na" aria-label="対象外">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3.5 7h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}
