import type { ReactNode } from 'react';
import { ApertureIcon, SlidersIcon } from '../components/icons';
import { TopAppBar } from '../components/TopAppBar';

/** ホームから遷移できるサブ画面。 */
export type HomeDestination = 'look' | 'check';

interface HomeScreenProps {
  onNavigate: (screen: HomeDestination) => void;
}

interface MenuItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

/** メニュー 1 行 (アイコン + 見出し + 説明)。行全体がボタン。 */
function MenuItem({ icon, title, description, onClick }: MenuItemProps) {
  return (
    <button type="button" className="menu-item" onClick={onClick}>
      <span className="menu-item__icon">{icon}</span>
      <span className="menu-item__text">
        <span className="menu-item__title">{title}</span>
        <span className="menu-item__desc">{description}</span>
      </span>
    </button>
  );
}

/**
 * トップレベルのホーム画面 (デザイン 45:321)。プラグインの 2 機能への入口を縦に並べる。
 * 「Variablesの確認」(チェックデザイン) を上、「ルックの調整」を下に配置する。
 */
export function HomeScreen({ onNavigate }: HomeScreenProps) {
  return (
    <div className="screen">
      <TopAppBar title="Common UI Plugin" />
      <div className="screen__body home">
        <header className="home__hero">
          <h2 className="home__title">Common UI Plugin</h2>
          <p className="home__lead">
            Toyotaが提供するデザインシステム「Common UI」のユーティティプラグイン
          </p>
        </header>
        <nav className="home__menu" aria-label="機能">
          <MenuItem
            icon={<ApertureIcon />}
            title="Variablesの確認"
            description="利用しているVariablesが適切かチェック"
            onClick={() => onNavigate('check')}
          />
          <MenuItem
            icon={<SlidersIcon />}
            title="ルックの調整"
            description="Variablesを調整してルックを調整"
            onClick={() => onNavigate('look')}
          />
        </nav>
      </div>
    </div>
  );
}
