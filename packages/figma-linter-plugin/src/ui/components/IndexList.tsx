import { useEffect, useState } from 'react';
import type { ComponentSummary, InspectionPreview } from '../../shared/messages';
import { ChevronIcon } from './icons';
import { CountBadges } from './CountBadges';

interface IndexListProps {
  /** 選択中のコンポーネント要約 (各 1 行)。 */
  items: ComponentSummary[];
  /** 行をクリックしてその index の詳細へドリルインする。 */
  onOpen: (index: number) => void;
}

/**
 * 複数選択時の Index (一覧)。各コンポーネントをサムネイル + 名前 + 合否件数の 1 行で並べる
 * (デザイン 106:1019)。アナトミー等の詳細は含めず、シンプルに表示する。行クリックで詳細へ。
 */
export function IndexList({ items, onOpen }: IndexListProps) {
  return (
    <div className="index-list">
      {items.map((item, i) => (
        <IndexRow key={item.nodeId} item={item} onOpen={() => onOpen(i)} />
      ))}
    </div>
  );
}

/** Index の 1 行 (サムネ + 名前 + 件数バッジ + 詳細キャレット)。検査対象外は淡く無効表示。 */
function IndexRow({ item, onOpen }: { item: ComponentSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="index-row"
      onClick={onOpen}
      disabled={!item.supported}
    >
      <span className="index-row__thumb">
        <Thumbnail preview={item.preview} />
      </span>
      <span className="index-row__details">
        <span className="index-row__name">{item.name}</span>
        {item.supported ? (
          <CountBadges pass={item.pass} fail={item.fail} />
        ) : (
          <span className="index-row__na">検査対象外</span>
        )}
      </span>
      {item.supported && (
        <span className="index-row__caret" aria-hidden="true">
          <ChevronIcon direction="right" />
        </span>
      )}
    </button>
  );
}

/** プレビュー PNG バイト列をサムネイル表示する (contain)。バイトが無ければ空。 */
function Thumbnail({ preview }: { preview: InspectionPreview | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!preview || preview.bytes.length === 0) {
      setUrl(null);
      return;
    }
    // Uint8Array をそのまま Blob に渡すと型でつまずくため、明示的に ArrayBuffer へコピーする。
    const buffer = new ArrayBuffer(preview.bytes.byteLength);
    new Uint8Array(buffer).set(preview.bytes);
    const objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [preview]);

  if (!url) return <span className="thumb__empty" aria-hidden="true" />;
  return <img className="thumb__img" src={url} alt="" draggable={false} />;
}
