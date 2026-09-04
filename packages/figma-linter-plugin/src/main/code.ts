/// <reference types="@figma/plugin-typings" />

import type {
  BaseScaleValue,
  PluginMessage,
  PresetSummary,
  UIMessage,
  VariableCollectionSummary,
} from "../shared/messages";
import {
  asExtension,
  classifyCollections,
  DEFAULT_PRESET_NAME,
  deriveBaseTokens,
  deriveSwapperGroups,
  ensureFontSizeBaseline,
  ensureSizingBaseline,
  getCollCached,
  getVarCached,
  mapVariablesByName,
  presetIdsForParent,
  valuesEqual,
} from "./schema";
import { applyFixes, applyFixesBulk, inspectNode, inspectSelection } from "./inspect";
import { applyConsistencyFixes, deriveConsistencyReport } from "./consistency";

// Show the React UI. `__html__` is the inlined dist/ui.html provided by Figma.
// `themeColors: true` injects the `--figma-color-*` CSS variables so the UI can
// follow the editor's light/dark theme. 高さは 2 機能 + 12 行プレビューが収まるよう広め。
figma.showUI(__html__, { width: 360, height: 600, themeColors: true });

// 書き込み系コマンドの再入ガード。figma.ui.onmessage は async でメッセージをシリアライズ
// しないため、Apply 連打や apply→reset の連投で 2 つの書き込み処理が await を跨いで
// 交錯しうる。1 つ走っている間は新しい書き込み要求を弾き、読み取り (get-*) は常に許可する。
let mutating = false;
/**
 * 書き込み処理を単発化する。実行できたら true、再入で弾いたら false を返す。
 * 呼び出し側は false のときに UI の一時状態 (applying/selected 等) を復旧できる。
 */
async function runMutation(fn: () => Promise<void>): Promise<boolean> {
  if (mutating) {
    // UI の状態 (applying フラグ等) を壊さないよう error は post せず通知だけ出す。
    figma.notify("前の処理が完了するまでお待ちください。");
    return false;
  }
  mutating = true;
  try {
    await fn();
  } finally {
    mutating = false;
  }
  return true;
}

// 機能4: チェックデザインを開いている間だけ true。選択変更で自動再検査する。
let inspecting = false;
// selectionchange はモジュール読込時に 1 度だけ登録し、inspecting のときだけ反応する。
figma.on("selectionchange", () => {
  if (inspecting) void postInspection();
});

// 検査リクエストの世代。選択を連打したとき、古い検査が新しい結果を上書きしないよう
// 完了時に最新世代かを照合して stale を捨てる (inspectSelection は mutating ガード外で並走しうる)。
let inspectSeq = 0;

/** 現在の選択を検査して UI へ送る (最新世代のみ反映)。 */
async function postInspection(): Promise<void> {
  const seq = ++inspectSeq;
  try {
    const payload = await inspectSelection();
    if (seq !== inspectSeq) return; // 後発の検査に追い越されたら破棄
    post({ type: "inspection", payload });
  } catch (error) {
    if (seq !== inspectSeq) return;
    post({ type: "error", message: errMessage(error) });
  }
}

/** nodeId を自動修正し、結果通知 + 最新の検査結果を送る。choices = 行ごとに選び直したトークン。 */
async function applyFixesAndReport(
  nodeId: string,
  choices?: Record<string, string>,
): Promise<void> {
  try {
    const { fixed, failed, changes } = await applyFixes(nodeId, choices);
    post({ type: "fixes-applied", fixed, failed });
    // 通知はモーダルの「変更件数」と揃えるため dedup 済みの changes を使う。
    if (fixed > 0) figma.notify(`${changes}件の変更を適用しました。`);
    else if (failed === 0) figma.notify("修正できる項目はありませんでした。");
    // 修正後の状態を反映するため再検査して送る。
    await postInspection();
  } catch (error) {
    post({ type: "error", message: withUndoHint(errMessage(error)) });
  }
}

/** id 指定の 1 ノードを詳細検査して UI へ送る (Index ドリルイン。selection は変えない)。 */
async function postNodeInspection(nodeId: string): Promise<void> {
  try {
    const result = await inspectNode(nodeId);
    // nodeId をエコーして UI 側で宛先照合できるようにする (result=null でも取り違えを防ぐ)。
    post({ type: "node-inspection", nodeId, result });
  } catch (error) {
    post({ type: "error", message: errMessage(error) });
  }
}

/** 複数 nodeId をまとめて自動修正し、残り修正があるノードだけを選択して再検査を送る。 */
async function applyFixesBulkAndReport(nodeIds: string[]): Promise<void> {
  try {
    const { fixed, failed, components, remaining } = await applyFixesBulk(nodeIds);
    post({ type: "bulk-fixes-applied", fixed, failed, components });
    if (fixed > 0) figma.notify(`${components}個のコンポーネントの${fixed}件を修正しました。`);
    else if (failed === 0) figma.notify("一括で修正できる項目はありませんでした。");
    // 残り修正があるコンポーネントだけを選択状態にして終わる。Color や値が変わる寸法など
    // 一括対象外が残ったものだけが選択に残り、ユーザーが個別に手当てできる (要件)。
    figma.currentPage.selection = remaining;
    // 件数・選択 (= 残り) を反映するため再検査して送る (選択据え置きでも件数を更新するため必須)。
    await postInspection();
  } catch (error) {
    post({ type: "error", message: withUndoHint(errMessage(error)) });
  }
}

/** 現在の選択 (Component Set) を横断検査して UI へ送る (読み取りのみ)。 */
async function postConsistency(): Promise<void> {
  try {
    const report = await deriveConsistencyReport();
    post({ type: "consistency", report });
  } catch (error) {
    post({ type: "error", message: errMessage(error) });
  }
}

/** 横断チェックの外れ値を揃え、結果通知 + 最新の横断結果を送る。 */
async function applyConsistencyAndReport(
  fixes: Array<{ nodeId: string; property: string; refId: string }>,
): Promise<void> {
  try {
    const { fixed, failed } = await applyConsistencyFixes(fixes);
    post({ type: "consistency-applied", fixed, failed });
    if (fixed > 0) figma.notify(`${fixed}件を揃えました。`);
    else if (failed === 0) figma.notify("揃える項目はありませんでした。");
    await postConsistency();
  } catch (error) {
    post({ type: "error", message: withUndoHint(errMessage(error)) });
  }
}

figma.ui.onmessage = async (msg: UIMessage) => {
  switch (msg.type) {
    case "get-collections":
      await sendCollections();
      break;
    case "get-file-info":
      sendFileInfo();
      break;
    case "notify":
      figma.notify(msg.message);
      break;
    case "resize":
      figma.ui.resize(Math.max(240, msg.width), Math.max(240, msg.height));
      break;
    case "close":
      figma.closePlugin();
      break;
    // --- 機能1: プリセット適用 ---
    case "get-presets":
      await sendPresets();
      break;
    case "apply-preset": {
      const ran = await runMutation(() => applyPreset(msg.presetId, msg.collectionIds));
      // 再入で弾かれたときは適用されていないので、UI の選択表示を実体へ戻す。
      if (!ran) await sendPresets();
      break;
    }
    // --- 機能2: サイズ調整 ---
    case "get-base-tokens":
      await sendBaseTokens();
      break;
    case "apply-base-scale":
      await runMutation(() => applyBaseScale(msg.values));
      break;
    case "reset-defaults": {
      // size / typography をまとめて 1 つの mutation で処理し、結果を 1 通だけ返す
      // (2 通連投すると再入ガードで typography 分が落ち resetting が固着するため)。
      const ran = await runMutation(resetAllDefaults);
      // 再入で弾かれたときは UI の resetting を解除できるよう終端通知を返す (restored は未使用)。
      if (!ran) post({ type: "defaults-reset", restored: 0 });
      break;
    }
    // --- 機能3: Token Swapper (System エイリアスの再割り当て) ---
    case "get-swapper-groups":
      await sendSwapperGroups();
      break;
    case "apply-swap":
      await runMutation(() => applySwap(msg.assignments));
      break;
    // --- 機能4: チェックデザイン ---
    case "set-inspecting":
      inspecting = msg.active;
      // 開いた瞬間に現在の選択を即時検査する (以降は selectionchange で自動更新)。
      if (msg.active) await postInspection();
      break;
    case "apply-fixes": {
      const ran = await runMutation(() => applyFixesAndReport(msg.nodeId, msg.choices));
      // 再入で弾かれたときは CheckScreen の「修正中…」を解除できるよう終端通知を返す。
      if (!ran) post({ type: "fixes-applied", fixed: 0, failed: 0 });
      break;
    }
    // --- 機能4 (複数選択): Index ドリルイン / 一括修正 ---
    case "inspect-node":
      // 読み取りのみ。mutating ガードの外で実行し、選択は変えずに詳細だけ返す。
      await postNodeInspection(msg.nodeId);
      break;
    case "apply-fixes-bulk": {
      const ran = await runMutation(() => applyFixesBulkAndReport(msg.nodeIds));
      // 再入で弾かれたときは Index の「修正中…」を解除できるよう終端通知を返す。
      if (!ran) post({ type: "bulk-fixes-applied", fixed: 0, failed: 0, components: 0 });
      break;
    }
    // --- 機能5: 横断チェック (Variant Consistency) ---
    case "get-consistency":
      // 読み取りのみ。mutating ガードの外で実行する。
      await postConsistency();
      break;
    case "apply-consistency-fixes": {
      const ran = await runMutation(() => applyConsistencyAndReport(msg.fixes));
      // 再入で弾かれたときは UI の「揃え中…」を解除できるよう終端通知を返す。
      if (!ran) post({ type: "consistency-applied", fixed: 0, failed: 0 });
      break;
    }
  }
};

// コレクション識別・分類 (層判定・廃止除外・プリセット親解決) は ./schema の
// classifyCollections に集約した。トークン名・値・エイリアスはプラグイン側に持たない。

// ---------------------------------------------------------------------------
// 機能1: プリセット適用 (Extended Collection の解決値で System をフラット化)
// ---------------------------------------------------------------------------

/**
 * Extended Collection を「プリセット名 (= collection 名)」でまとめて UI に返す。Dimension
 * System 用と Typography System 用に同名の Extended Collection ("Expressive" / "Productive")
 * があるので、同名を 1 プリセットに束ね、適用時に両方の親へ焼けるよう id を集める。
 */
async function sendPresets(): Promise<void> {
  try {
    const { extensions } = await classifyCollections();
    // 同名 (前後空白・大文字小文字を無視) でグルーピング。初出順を維持する。
    const groups = new Map<string, PresetSummary>();
    for (const ext of extensions) {
      const key = ext.name.trim().toLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.collectionIds.push(ext.id);
      } else {
        groups.set(key, { id: key, name: ext.name, collectionIds: [ext.id] });
      }
    }
    const presets = [...groups.values()];
    // active プリセット: ファイル記録 (pluginData) を正とし、無ければ現在値からの判定に
    // フォールバックする (旧来のファイルや外部で焼かれた場合のベストエフォート)。
    let activeId: string | null = null;
    const stored = readActivePreset();
    if (stored && presets.some((p) => p.id === stored)) {
      activeId = stored;
    } else {
      try {
        activeId = await detectActivePreset(presets);
      } catch {
        activeId = null;
      }
    }
    post({ type: "presets", presets, activeId });
  } catch (error) {
    post({ type: "error", message: errMessage(error) });
  }
}

// 値比較 (valuesEqual) は ./schema に集約。

/**
 * 現在の System 状態と一致するプリセットの id を返す (無ければ null)。各プリセット (同名 Extended
 * Collection 群) が override している全トークンを、親 System の現在値と突き合わせ、すべて一致した
 * プリセットを active とみなす。最初の不一致で早期打ち切り、最初に一致したプリセットを採用する。
 */
async function detectActivePreset(
  presets: PresetSummary[],
): Promise<string | null> {
  const collCache = new Map<string, VariableCollection | null>();
  const varCache = new Map<string, Variable | null>();
  for (const preset of presets) {
    if (await presetIsActive(preset, collCache, varCache)) return preset.id;
  }
  return null;
}

/** プリセットが現在 System に焼かれているか (override 値が親の現在値とすべて一致するか)。 */
async function presetIsActive(
  preset: PresetSummary,
  collCache: Map<string, VariableCollection | null>,
  varCache: Map<string, Variable | null>,
): Promise<boolean> {
  let compared = false; // 比較対象が 1 つも無ければ active 扱いしない
  for (const collectionId of preset.collectionIds) {
    const collection = await getCollCached(collectionId, collCache);
    const ext = collection ? asExtension(collection) : null;
    if (!collection || !ext) continue;
    const parent = await getCollCached(
      ext.parentVariableCollectionId,
      collCache,
    );
    if (!parent) continue;
    const modeMap = ext.modes
      .filter((m) => parent.modes.some((pm) => pm.modeId === m.parentModeId))
      .map((m) => ({ extModeId: m.modeId, parentModeId: m.parentModeId }));
    if (modeMap.length === 0) continue;

    for (const varId of parent.variableIds) {
      const variable = await getVarCached(varId, varCache);
      if (
        !variable ||
        (variable.resolvedType !== "FLOAT" &&
          variable.resolvedType !== "STRING")
      )
        continue;
      const extVals = await variable.valuesByModeForCollectionAsync(collection);
      // override が無い (= プリセットが触らない) 変数は比較対象外。親値の読取も遅延する。
      let parentVals: { [modeId: string]: VariableValue } | null = null;
      for (const { extModeId, parentModeId } of modeMap) {
        const presetValue = extVals[extModeId];
        if (presetValue === undefined) continue;
        if (!parentVals)
          parentVals = await variable.valuesByModeForCollectionAsync(parent);
        compared = true;
        if (!valuesEqual(parentVals[parentModeId], presetValue)) return false;
      }
    }
  }
  return compared;
}

/**
 * 選んだプリセット (同名 Extended Collection 群) の解決済み値で、各 extension が拡張して
 * いる親コレクション (Dimension System / Typography System) の全トークンを上書きする。
 * 親は extension の parentVariableCollectionId から解決するので、Dimension でも Typography
 * でも同一処理で焼ける。親の variableIds を一律ループするため、差分トークンが増えても処理は
 * 不変 (特定トークンへのハードコードなし)。
 *
 * ⚠ extension のモード id は親のモード id とは別物 (親モードへは parentModeId で写像する)。
 * Dimension System は単一モードだが、Typography System は JP/EN の複数モードを持つため、
 * モードごとに対応する親モードへ焼いて言語差を保つ (全モードを同値に潰さない)。
 */
async function applyPresetToCollections(
  collectionIds: string[],
): Promise<{ applied: number; skipped: number }> {
  const varCache = new Map<string, Variable | null>();
  const collCache = new Map<string, VariableCollection | null>();

  // --- Phase 1: 解決してプラン化 (この段では一切書き込まない) ---
  // 途中失敗で半端な書き込みを残さないよう、全 write を先に組み立ててから一括適用する。
  // 解決中に例外が出ても 1 件も書いていない状態で中断できる。
  const plan: Array<{
    variable: Variable;
    modeId: string;
    value: VariableValue;
  }> = [];
  const wroteVarIds = new Set<string>();
  let skipped = 0; // 実際の失敗のみを数える (意図的な型除外はカウントしない)

  for (const collectionId of collectionIds) {
    // collection は VariableCollection 型のまま valuesByModeForCollectionAsync に渡し、
    // ext は parentVariableCollectionId / parentModeId 参照用に絞り込む。
    const collection = await getCollCached(collectionId, collCache);
    const ext = collection ? asExtension(collection) : null;
    if (!collection || !ext) {
      skipped++;
      continue;
    }
    // この extension が拡張している親 (Dimension System / Typography System)。
    const parent = await getCollCached(
      ext.parentVariableCollectionId,
      collCache,
    );
    if (!parent) {
      skipped++;
      continue;
    }
    // extension モード → 親モード の写像 (parentModeId)。親に存在するモードだけ残す。
    const modeMap = ext.modes
      .filter((m) => parent.modes.some((pm) => pm.modeId === m.parentModeId))
      .map((m) => ({ extModeId: m.modeId, parentModeId: m.parentModeId }));
    if (modeMap.length === 0) {
      skipped++;
      continue;
    }

    for (const varId of parent.variableIds) {
      const variable = await getVarCached(varId, varCache);
      if (!variable) continue;
      // サイズ/フォントサイズ (FLOAT) と font-family/weight・mode 切替用の STRING のみ焼く。
      // COLOR/BOOLEAN 等の無関係なトークンは「プリセット対象外」の意図的な除外なので、
      // skipped には数えない (ユーザーに見せる skip 数を実際の失敗だけに保つ)。
      if (
        variable.resolvedType !== "FLOAT" &&
        variable.resolvedType !== "STRING"
      )
        continue;

      // プリセット側の各モードの値 (override 込み)。エイリアス(参照)は解決せずそのまま焼いて
      // 参照を維持する → 機能2 (サイズ/タイポのスケール) の連動が効き続ける。各 extension
      // モードの値を、対応する親モードへ書く (JP→JP / EN→EN / Default→Default)。
      const byMode = await variable.valuesByModeForCollectionAsync(collection);
      let planned = false;
      for (const { extModeId, parentModeId } of modeMap) {
        const presetValue = byMode[extModeId];
        if (presetValue === undefined) continue;
        plan.push({ variable, modeId: parentModeId, value: presetValue });
        planned = true;
      }
      if (planned) wroteVarIds.add(variable.id);
      else skipped++; // 対象型なのにプリセット値が 1 モードも無かった = 実質の失敗
    }
  }

  // --- Phase 2: プランを一括適用 ---
  for (const { variable, modeId, value } of plan) {
    variable.setValueForMode(modeId, value);
  }

  return { applied: wroteVarIds.size, skipped };
}

/**
 * 選んだプリセット (同名 Extended Collection 群) の解決済み値で、各 extension が拡張して
 * いる親コレクション (Dimension System / Typography System) の全トークンを上書きする。
 * 親は extension の parentVariableCollectionId から解決するので、Dimension でも Typography
 * でも同一処理で焼ける。親の variableIds を一律ループするため、差分トークンが増えても処理は
 * 不変 (特定トークンへのハードコードなし)。
 *
 * ⚠ extension のモード id は親のモード id とは別物 (親モードへは parentModeId で写像する)。
 * Dimension System は単一モードだが、Typography System は JP/EN の複数モードを持つため、
 * モードごとに対応する親モードへ焼いて言語差を保つ (全モードを同値に潰さない)。
 */
async function applyPreset(
  presetId: string,
  collectionIds: string[],
): Promise<void> {
  try {
    const { applied, skipped } = await applyPresetToCollections(collectionIds);
    // 適用したプリセットを active として記録する (リロードしても保持。判定の正)。
    storeActivePreset(presetId);
    post({ type: "apply-done", applied, skipped });
  } catch (error) {
    post({ type: "error", message: withUndoHint(errMessage(error)) });
  }
}

/** active プリセット記録のキー (ファイル内 pluginData)。 */
const ACTIVE_PRESET_KEY = "activePreset";

/** 適用中プリセットの id を記録する (空文字でクリア)。 */
function storeActivePreset(id: string): void {
  try {
    figma.root.setPluginData(ACTIVE_PRESET_KEY, id);
  } catch {
    // pluginData が使えない環境でも他機能を止めない (記録だけ諦める)。
  }
}

/** 記録された active プリセットの id (無ければ空文字)。 */
function readActivePreset(): string {
  try {
    return figma.root.getPluginData(ACTIVE_PRESET_KEY);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// 機能2: サイズ調整 (Reference の Sizing/* をスケール)
// ---------------------------------------------------------------------------

// 出荷時基準値・トークン一覧はプラグインに持たず、live (Dimension Reference) から導出する
// (./schema deriveBaseTokens)。冪等性の基準 (shipped) は Figma 側 pluginData の
// ベースラインに保持し、ソースコードにトークン名・値を書かない。

/** スケール対象 (Reference の Sizing/* スカラー) を live から導出して UI に返す。 */
async function sendBaseTokens(): Promise<void> {
  try {
    const tokens = await deriveBaseTokens();
    post({ type: "base-tokens", tokens });
  } catch (error) {
    post({ type: "error", message: errMessage(error) });
  }
}

/**
 * UI が確定計算した値を各トークンに直接書き込む (参照を剥がし実数化)。
 * 対象は Reference の Sizing/* (サイズ) と Typography Reference の FontSize/* (タイポ)。
 * 変数ごとに所属コレクションを引き、その全モードに同値を書く (機能1 と同じく単一値に畳む)。
 */
async function applyBaseScale(values: BaseScaleValue[]): Promise<void> {
  try {
    const collCache = new Map<string, VariableCollection | null>();

    // Phase 1: 解決 + 検証 (書き込み前に弾く)。変数が消えている / 型違い / 非有限値
    // (NaN・Infinity) は書かない。書き込み前に全件を検証するので半端な適用を防げる。
    const plan: Array<{
      variable: Variable;
      modes: ReadonlyArray<{ modeId: string }>;
      value: number;
    }> = [];
    for (const { id, value } of values) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      if (
        !variable ||
        variable.resolvedType !== "FLOAT" ||
        !Number.isFinite(value)
      )
        continue;
      const collection = await getCollCached(
        variable.variableCollectionId,
        collCache,
      );
      if (!collection) continue;
      plan.push({ variable, modes: collection.modes, value });
    }

    // Phase 2: 一括書き込み (Reference は単一モード。「全モードへ同値」は仕様どおり)。
    for (const { variable, modes, value } of plan) {
      for (const mode of modes) variable.setValueForMode(mode.modeId, value);
    }

    // requested と count の差 = 対象が見つからず未反映だった件数 (UI で明示する)。
    post({
      type: "base-scale-applied",
      count: plan.length,
      requested: values.length,
    });
  } catch (error) {
    post({ type: "error", message: withUndoHint(errMessage(error)) });
  }
}

// ---------------------------------------------------------------------------
// 機能2: 出荷時デフォルトに復元 (リセット)
// ---------------------------------------------------------------------------
//
// reset = Figma 上の "Expressive" プリセット (Extended Collection) を System へ適用して
// 参照構造を出荷時へ戻し、Reference の生値は pluginData ベースライン (./schema) から復元する。
// 出荷時の参照先テーブルをプラグインに持たないため、Figma 側でトークンを追加・改名・付け替え
// しても追従する (= Figma が唯一のマスター)。

/**
 * サイズ系・タイポグラフィ系をまとめて出荷時デフォルトへ復元し、結果を 1 通だけ返す。
 * 1 つの mutation 内で順次処理するので、再入ガードで片方が落ちることがない (旧実装は
 * size / typography を別メッセージで連投していたため typography 分が握り潰されていた)。
 */
async function resetAllDefaults(): Promise<void> {
  // 出荷時に戻すとプリセットの焼き込みも解けるので、active プリセット記録もクリアする。
  storeActivePreset("");
  try {
    const sizeRestored = await resetSizingDefaults();
    const typoRestored = await resetTypographyDefaults();
    post({ type: "defaults-reset", restored: sizeRestored + typoRestored });
  } catch (error) {
    post({ type: "error", message: withUndoHint(errMessage(error)) });
  }
}

// 出荷時の参照構造・生値はプラグインに持たない。reset は Figma 上の "Expressive"
// プリセット (Extended Collection) を System へ適用して参照を出荷時へ戻し、Reference の
// 生値は ./schema の pluginData ベースラインから復元する (DEFAULT_* 表は全廃)。



/**
 * サイズ系トークンを出荷時デフォルトへ復元する。
 * - Reference Sizing/* : 出荷時生値 (pluginData ベースライン) を書き戻す (全モード)。
 * - System 参照構造    : Figma 上の "Expressive" プリセット (Extended Collection) を
 *   Dimension System へ適用して参照を出荷時へ戻す (= 出荷時 = Expressive)。
 *   プラグイン側に参照先トークン表を持たない。
 * Expressive プリセットが無いファイルでは生値の復元のみ行う。戻り値 = 書き戻した変数数。
 * 失敗 (Reference 不在) は throw し、呼び出し側 (resetAllDefaults) でまとめて error を post する。
 */
async function resetSizingDefaults(): Promise<number> {
  const { reference, system, extensions } = await classifyCollections();
  if (!reference) {
    throw new Error("Dimension Reference コレクションが見つかりません。");
  }
  const cache = new Map<string, Variable | null>();
  let restored = 0;

  // (1) Reference の Sizing/* 生値を出荷時ベースラインへ戻す。
  const baseline = await ensureSizingBaseline(reference, cache);
  const refByName = await mapVariablesByName(reference, cache);
  for (const [name, value] of Object.entries(baseline)) {
    const variable = refByName.get(name);
    if (!variable || variable.resolvedType !== "FLOAT") continue;
    for (const mode of reference.modes) {
      variable.setValueForMode(mode.modeId, value);
    }
    restored++;
  }

  // (2) System の参照構造を Expressive プリセット (出荷時デフォルト) で焼き直す。
  if (system) {
    const ids = presetIdsForParent(extensions, system.id, DEFAULT_PRESET_NAME);
    if (ids.length > 0) {
      const { applied } = await applyPresetToCollections(ids);
      restored += applied;
    }
  }

  return restored;
}

/**
 * タイポグラフィ系トークンを出荷時デフォルトへ復元する。
 * - Typography References の FontSize/* : 出荷時生値 (pluginData ベースライン) を書き戻す。
 * - Typography System の参照構造        : "Expressive" プリセット (Extended Collection) を
 *   Typography System へ適用して参照を出荷時へ戻す。FontSize 以外 (FontFamily/Weight/
 *   LetterSpacing) はプリセット適用が JP/EN の値をそのまま焼くため言語差を保つ。
 * Expressive プリセットが無いファイルでは生値の復元のみ行う。戻り値 = 書き戻した変数数。
 * 失敗 (Typography Reference 不在) は throw し、呼び出し側でまとめて error を post する。
 */
async function resetTypographyDefaults(): Promise<number> {
  const { typography, typographySystem, extensions } =
    await classifyCollections();
  if (!typography) {
    throw new Error("Typography Reference コレクションが見つかりません。");
  }
  const cache = new Map<string, Variable | null>();
  let restored = 0;

  // (1) Typography Reference の FontSize/* 生値を出荷時ベースラインへ戻す。
  const baseline = await ensureFontSizeBaseline(typography, cache);
  const refByName = await mapVariablesByName(typography, cache);
  for (const [name, value] of Object.entries(baseline)) {
    const variable = refByName.get(name);
    if (!variable || variable.resolvedType !== "FLOAT") continue;
    for (const mode of typography.modes) {
      variable.setValueForMode(mode.modeId, value);
    }
    restored++;
  }

  // (2) Typography System の参照構造を Expressive プリセットで焼き直す。
  if (typographySystem) {
    const ids = presetIdsForParent(
      extensions,
      typographySystem.id,
      DEFAULT_PRESET_NAME,
    );
    if (ids.length > 0) {
      const { applied } = await applyPresetToCollections(ids);
      restored += applied;
    }
  }

  return restored;
}

// ---------------------------------------------------------------------------
// 機能3: Token Swapper (System のエイリアス段を別の Reference トークンへ再割り当て)
// ---------------------------------------------------------------------------
//
// グループ・段・選択肢・出荷時参照先 (defaultRefName) はすべて ./schema の
// deriveSwapperGroups が live + Expressive プリセットから導出する。ここでは (1) その
// 読み取り (sendSwapperGroups) と (2) UI が確定した割り当ての書き込み (applySwap) を担う。
// 番兵 (none/full/0) は値で判定して除外する (名前リテラルを持たない)。オフセット (段シフト)
// の計算は UI 側 (lib/swap.ts) が行い、ここには確定済みの {System 変数 → Reference 変数} が届く。

/** Token Swapper のグループ一覧を live から導出して UI に返す。 */
async function sendSwapperGroups(): Promise<void> {
  try {
    const groups = await deriveSwapperGroups();
    post({ type: "swapper-groups", groups });
  } catch (error) {
    post({ type: "error", message: errMessage(error) });
  }
}

/**
 * UI が確定した割り当て ({System 変数 id → Reference 変数 id}) をエイリアスとして書き込む。
 * System の全モードへ同じ参照を張る (resetSizingDefaults と同じ要領)。対象が見つからない /
 * 型違いはスキップし、書けた件数 (count) と要求数 (requested) を返す。
 */
async function applySwap(
  assignments: Array<{ id: string; refId: string }>,
): Promise<void> {
  try {
    const varCache = new Map<string, Variable | null>();
    const collCache = new Map<string, VariableCollection | null>();

    // Phase 1: 解決してプラン化 (書き込み前に全件解決し、半端な適用を防ぐ)。
    const plan: Array<{
      variable: Variable;
      modes: ReadonlyArray<{ modeId: string }>;
      alias: VariableAlias;
    }> = [];
    for (const { id, refId } of assignments) {
      const variable = await getVarCached(id, varCache);
      const ref = await getVarCached(refId, varCache);
      if (!variable || variable.resolvedType !== "FLOAT" || !ref) continue;
      const collection = await getCollCached(
        variable.variableCollectionId,
        collCache,
      );
      if (!collection) continue;
      plan.push({
        variable,
        modes: collection.modes,
        alias: { type: "VARIABLE_ALIAS", id: ref.id },
      });
    }

    // Phase 2: 一括適用。
    for (const { variable, modes, alias } of plan) {
      for (const mode of modes) variable.setValueForMode(mode.modeId, alias);
    }

    post({
      type: "swap-applied",
      count: plan.length,
      requested: assignments.length,
    });
  } catch (error) {
    post({ type: "error", message: withUndoHint(errMessage(error)) });
  }
}

// ---------------------------------------------------------------------------
// 既存: コレクション一覧 (テンプレート由来。リファクタして errMessage を共有)
// ---------------------------------------------------------------------------

/** Common UI Kit 本体ファイルの fileKey。ブランチは別 fileKey になるため一致せず除外される。 */
const COMMON_UI_KIT_FILE_KEY = "dhuY0Fs1irfTaxTRbTCd1h";

/**
 * 現在のファイルが Common UI Kit 本体か (ブランチを除く) を UI に返す。`figma.fileKey` は
 * private plugin API (manifest の `enablePrivatePluginApi` 必須) で、取得できない環境
 * (未対応・権限なし) では undefined になるので、その場合は false (= 表示しない)。
 */
function sendFileInfo(): void {
  let isCommonUiKit = false;
  try {
    isCommonUiKit = figma.fileKey === COMMON_UI_KIT_FILE_KEY;
  } catch {
    isCommonUiKit = false;
  }
  post({ type: "file-info", isCommonUiKit });
}

async function sendCollections(): Promise<void> {
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();
    const summaries: VariableCollectionSummary[] = collections.map(
      (collection) => ({
        id: collection.id,
        name: collection.name,
        modeCount: collection.modes.length,
        variableCount: collection.variableIds.length,
      }),
    );
    post({ type: "collections", collections: summaries });
  } catch (error) {
    post({ type: "error", message: errMessage(error) });
  }
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

// 共有ヘルパー (getVarCached / mapVariablesByName / getCollCached / asExtension /
// asAlias / valuesEqual) は ./schema に集約し、main 全体で共有する。

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 書き込み系の失敗メッセージに「取り消し可能」案内を添える。Figma はプラグイン実行ごとに
 *  undo ステップを 1 つ作るので、途中で失敗しても ⌘Z / Ctrl+Z でまとめて巻き戻せる。 */
function withUndoHint(message: string): string {
  return `${message}（変更は ⌘Z / Ctrl+Z で取り消せます）`;
}

function post(message: PluginMessage): void {
  figma.ui.postMessage(message);
}
