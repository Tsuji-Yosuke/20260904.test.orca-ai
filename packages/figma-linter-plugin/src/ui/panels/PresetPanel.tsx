import type { PresetSummary } from '../../shared/messages';
import { RadioCardGroup, type RadioCardOption } from '../components/RadioCard';

/**
 * プリセット名 (Extended Collection 名 = "Expressive" / "Productive") ごとの説明文。Figma の
 * variable collection には description を持てないため、デザイン表記に合わせて UI 側で
 * 対応づける (小文字キーで照合)。
 */
const PRESET_DESCRIPTIONS: Record<string, string> = {
  expressive: 'Webサイトに最適',
  productive: 'SaaS系プロダクトに最適',
};

interface PresetPanelProps {
  presets: PresetSummary[] | null;
  /** 選択中プリセット id。未選択は null。 */
  selectedId: string | null;
  /** プリセット選択 = 即時適用 (デザインに Apply ボタンが無いため)。 */
  onSelect: (preset: PresetSummary) => void;
  disabled?: boolean;
}

/** 機能1: プリセット (同名 Extended Collection 群) をカードで選び、選択即時に焼き込む。 */
export function PresetPanel({ presets, selectedId, onSelect, disabled = false }: PresetPanelProps) {
  return (
    <section className="section">
      <h2 className="section__title">プリセット</h2>

      {presets === null ? (
        <p className="state">読み込み中…</p>
      ) : presets.length === 0 ? (
        <p className="state">プリセット（Extended Collection）が見つかりません。</p>
      ) : (
        <RadioCardGroup
          ariaLabel="プリセット"
          value={selectedId}
          disabled={disabled}
          options={presets.map(
            (preset): RadioCardOption<string> => ({
              value: preset.id,
              title: preset.name,
              description: PRESET_DESCRIPTIONS[preset.name.toLowerCase()],
            }),
          )}
          onChange={(id) => {
            const preset = presets.find((p) => p.id === id);
            if (preset) onSelect(preset);
          }}
        />
      )}
    </section>
  );
}
