import { TopAppBar } from '../components/TopAppBar';
import { AlertCircleIcon } from '../components/icons';
import type { UpdateInfo } from '../lib/updateCheck';

/**
 * 更新通知の全面画面 (デザイン 109:785)。新しい配布が見つかったとき home/look/check の代わりに
 * 全面表示し、最新 Release のダウンロードを促す。自己更新は Figma に API が無く不可能なため、
 * 閉じる手段は持たず更新導線に集中させる (ダウンロード → zip を展開して手動 import)。
 */
export function UpdateScreen({ update }: { update: UpdateInfo }) {
  return (
    <div className="screen">
      <TopAppBar title="Common UI Plugin" />
      <div className="screen__body update">
        <div className="update__content">
          <AlertCircleIcon className="update__icon" />
          <div className="update__text">
            <h2 className="update__title">新しいバージョンがあります</h2>
            <p className="update__desc">
              v{update.version}({update.buildNumber})が公開されました。新しいバージョンをダウンロードして更新してください。
            </p>
          </div>
        </div>
        <a className="update__action" href={update.downloadUrl} target="_blank" rel="noreferrer">
          ダウンロード
        </a>
      </div>
    </div>
  );
}
