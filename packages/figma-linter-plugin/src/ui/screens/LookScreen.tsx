import { useEffect, useRef, useState } from 'react';
import type { PresetSummary, SwapperGroup } from '../../shared/messages';
import { emit, onMessage } from '../messaging';
import { PresetPanel } from '../panels/PresetPanel';
import { TokenPanel } from '../panels/TokenPanel';
import { TopAppBar } from '../components/TopAppBar';
import { ResetConfirmModal } from '../components/ResetConfirmModal';

interface LookScreenProps {
  /** ホームへ戻る。 */
  onBack: () => void;
}

/**
 * ルックの調整画面 (旧トップページ)。プリセット選択 (機能1) と Token Swapper (機能3) を
 * 1 ページに縦積みし、上部バーのリスタートで全ドメインを出荷時へ戻す。いずれも Apply ボタン
 * 無しの即時反映。メッセージ購読はこの画面が自前で持ち、他画面向けメッセージは無視する。
 */
export function LookScreen({ onBack }: LookScreenProps) {
  const [presets, setPresets] = useState<PresetSummary[] | null>(null);
  const [groups, setGroups] = useState<SwapperGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  // リセット後、全 Swapper のローカル状態 (offset/overrides) を作り直すためのキー。
  const [resetNonce, setResetNonce] = useState(0);
  // プリセット適用後、Spacing/Sizing の Swapper だけ作り直すためのキー (FontSize は対象外)。
  const [presetNonce, setPresetNonce] = useState(0);
  // reset 由来の error のときだけ再同期する (get-* 失敗 error での再同期ループを防ぐ)。
  const wasResetting = useRef(false);

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      switch (message.type) {
        case 'presets':
          setError(null);
          setPresets(message.presets);
          setSelectedPreset(message.activeId);
          break;
        case 'swapper-groups':
          setError(null);
          setGroups(message.groups);
          break;
        case 'apply-done':
          if (message.applied === 0) {
            setError('プリセットの適用対象が見つかりませんでした。');
          }
          setPresetNonce((n) => n + 1);
          emit({ type: 'get-swapper-groups' });
          break;
        case 'defaults-reset':
          // size + typography をまとめて 1 通で受ける。Swapper を作り直し処理中を解除する。
          wasResetting.current = false;
          setResetNonce((n) => n + 1);
          setResetting(false);
          setSelectedPreset(null);
          emit({ type: 'get-swapper-groups' });
          emit({ type: 'get-presets' });
          break;
        case 'error':
          setError(message.message);
          setPresets((prev) => prev ?? []);
          setGroups((prev) => prev ?? []);
          setResetting(false);
          // reset 途中失敗などで一部だけ書き換わっている可能性があるときだけ live を取り直す。
          // get-* 自体の失敗で再同期を撃つと error→再同期→error の無限ループになるため、
          // reset 起因のとき (wasResetting) に 1 回だけ実行する。
          if (wasResetting.current) {
            wasResetting.current = false;
            emit({ type: 'get-presets' });
            emit({ type: 'get-swapper-groups' });
          }
          break;
        default:
          break; // 他画面向け (file-info / inspection など) は無視。
      }
    });
    emit({ type: 'get-presets' });
    emit({ type: 'get-swapper-groups' });
    return unsubscribe;
  }, []);

  const applyPreset = (preset: PresetSummary) => {
    setSelectedPreset(preset.id);
    setError(null);
    emit({ type: 'apply-preset', presetId: preset.id, collectionIds: preset.collectionIds });
  };

  const applySwap = (assignments: Array<{ id: string; refId: string }>) => {
    setError(null);
    emit({ type: 'apply-swap', assignments });
  };

  const runReset = () => {
    setConfirmReset(false);
    setResetting(true);
    wasResetting.current = true;
    emit({ type: 'reset-defaults' });
  };

  const loading = presets === null && groups === null;

  return (
    <div className="screen">
      <TopAppBar
        title="ルックの調整"
        onBack={onBack}
        onReset={() => setConfirmReset(true)}
        resetDisabled={loading || resetting}
      />

      {error && (
        <p className="state state--error app__error" role="alert">
          ⚠️ {error}
        </p>
      )}

      <div className="screen__body app__body">
        <PresetPanel
          presets={presets}
          selectedId={selectedPreset}
          onSelect={applyPreset}
          disabled={resetting}
        />

        <TokenPanel
          groups={groups}
          onApplySwap={applySwap}
          resetNonce={resetNonce}
          presetNonce={presetNonce}
        />
      </div>

      {confirmReset && (
        <ResetConfirmModal
          busy={resetting}
          onCancel={() => setConfirmReset(false)}
          onConfirm={runReset}
        />
      )}
    </div>
  );
}
