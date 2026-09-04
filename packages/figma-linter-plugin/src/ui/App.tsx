import { useEffect, useState } from 'react';
import { emit, onMessage } from './messaging';
import { checkForUpdate, type UpdateInfo } from './lib/updateCheck';
import { HomeScreen, type HomeDestination } from './screens/HomeScreen';
import { LookScreen } from './screens/LookScreen';
import { CheckScreen } from './screens/CheckScreen';
import { UpdateScreen } from './screens/UpdateScreen';

/** 表示中の画面。home = トップのメニュー、look = ルック調整、check = チェックデザイン。 */
type Screen = 'home' | HomeDestination;

/**
 * トップレベルの画面ルーター (デザイン 45:321)。ホームのメニューから「ルックの調整」(旧トップ
 * ページ) と「Variablesの確認」(チェックデザイン) へ遷移する。各画面が自前でメッセージを購読
 * するため、App はルーティングと、本体ファイル注意アラート (file-info) / 起動時の更新チェック
 * (update) だけを担う。新しい配布が見つかったときは本体の代わりに更新案内 (UpdateScreen) を全面表示する。
 */
export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  // 現在のファイルが Common UI Kit 本体 (ブランチ除く) のときだけ上部にアラートを出す。
  const [isCommonUiKit, setIsCommonUiKit] = useState(false);
  // 公開 Worker と比べて新しい配布があれば入る。検知したら本体の代わりに更新画面を出す。
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      if (message.type === 'file-info') setIsCommonUiKit(message.isCommonUiKit);
    });
    emit({ type: 'get-file-info' });
    return unsubscribe;
  }, []);

  // 起動時に一度だけ更新チェック。非ブロッキングかつ fail-soft (例外は checkForUpdate 内で吸収し、
  // オフライン / dev ビルド等では null が返って何も出ない)。
  useEffect(() => {
    void checkForUpdate().then(setUpdate);
  }, []);

  // 新しい配布が見つかったら、本体機能 (home/look/check) の代わりに更新案内を全面表示する。
  if (update) {
    return (
      <div className="app">
        <UpdateScreen update={update} />
      </div>
    );
  }

  return (
    <div className="app">
      {isCommonUiKit && (
        <p className="alert" role="alert">
          これはCommon UI Kit本体のファイルです。
        </p>
      )}

      {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
      {screen === 'look' && <LookScreen onBack={() => setScreen('home')} />}
      {screen === 'check' && <CheckScreen onBack={() => setScreen('home')} />}
    </div>
  );
}
