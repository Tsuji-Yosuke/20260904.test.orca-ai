/**
 * 起動時のバージョンチェック (UI iframe 側で完結)。公開 Worker の version.json と、ビルド時に
 * 焼き込んだ自分の run_number (__BUILD_NUMBER__) を比べ、新しい配布があれば知らせる。
 * 自己更新は Figma に API が無く不可能なので、本機能は「検知して手動 import を促す」までを担う。
 *
 * 設計の要点:
 * - fetch は必ず fail-soft。オフライン / CSP ブロック / 404 / JSON 破損 / dev ビルドのいずれでも
 *   null を返し、起動や既存機能を絶対に止めない。
 * - 比較キーは CI が自動採番する buildNumber (単調増加)。package.json の version は手動更新で
 *   stale になりうるので判定には使わず、表示専用にする。
 * - dev / ローカルビルドは __BUILD_NUMBER__ が数値化できない ('dev'→NaN) ので即 null = バナー抑止。
 */

// orca-ds アカウントにデプロイ済みの更新チェック用エンドポイント (worker/)。URL を変える場合は
// manifest.json の networkAccess.allowedDomains も同じオリジンに合わせること (2 箇所が一致する必要)。
export const VERSION_JSON_URL = 'https://orca-plugin-version.orca-ds.workers.dev/version.json';

/** version.json のスキーマ (Worker が返す JSON)。CI が main ビルドごとに生成する。 */
export interface LatestVersion {
  /** CI のリリース buildNumber。更新判定の比較キー。 */
  buildNumber: number;
  /** 表示用バージョン (package.json version)。判定には使わない。 */
  version: string;
  /** これを下回る buildNumber のビルドは強制更新 (UI 全体をブロック)。 */
  minBuildNumber: number;
  /** 更新時に開くダウンロード先 (GitHub Release ページ)。 */
  downloadUrl: string;
  /** 任意: ビルド元の commit SHA / 公開時刻 (表示・デバッグ用)。 */
  sha?: string;
  publishedAt?: string;
}

/**
 * 更新通知 1 件。buildNumber は更新画面の表示 ("(20)") 用。forced (minBuildNumber 割れ) は現状の
 * UI では区別しない (更新があれば常に全面表示する) が、将来の出し分け用に保持する。
 */
export interface UpdateInfo {
  version: string;
  /** 最新のリリース build 番号。 */
  buildNumber: number;
  downloadUrl: string;
  forced: boolean;
}

/** fetch のタイムアウト (ms)。ネットワーク待ちで起動を遅らせない。 */
const TIMEOUT_MS = 6000;

/**
 * 最新版を取得し、自分より新しければ UpdateInfo を返す。更新不要 / 取得失敗 / dev ビルドは null。
 * 例外は一切投げない (全経路 fail-soft)。
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  // dev / ローカルビルド ('dev') は比較対象にしない (Number('dev') = NaN)。
  const current = Number(__BUILD_NUMBER__);
  if (!Number.isFinite(current)) return null;

  try {
    const latest = await fetchLatest();
    if (!latest) return null;
    return evaluateUpdate(current, latest);
  } catch {
    return null;
  }
}

/** version.json を取得する (自前タイムアウト + キャッシュバスト付き)。形が不正/失敗なら null。 */
async function fetchLatest(): Promise<LatestVersion | null> {
  // AbortSignal に頼らず Promise.race で自前タイムアウト (Figma iframe の fetch 実装差を避ける)。
  const url = `${VERSION_JSON_URL}?t=${Date.now()}`;
  const res = await Promise.race([
    fetch(url, { method: 'GET' }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
  ]);
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<LatestVersion>;
  // 最低限の形チェック: buildNumber が有限数でなければ無効な JSON とみなす。
  if (typeof data.buildNumber !== 'number' || !Number.isFinite(data.buildNumber)) return null;
  return data as LatestVersion;
}

/**
 * 取得済みの最新版と自分のビルド番号を比較して UpdateInfo を決める。fetch を含まない純関数なので
 * 単体テストしやすい。
 * - latest.buildNumber <= current : 最新 → null
 * - current < minBuildNumber       : 強制更新 (forced=true)
 * - それ以外で新しい               : 通常のお知らせ (forced=false)
 */
export function evaluateUpdate(current: number, latest: LatestVersion): UpdateInfo | null {
  if (!(latest.buildNumber > current)) return null;
  const min = Number(latest.minBuildNumber);
  const forced = Number.isFinite(min) && current < min;
  return {
    version: latest.version ?? '',
    buildNumber: latest.buildNumber,
    downloadUrl: latest.downloadUrl ?? '',
    forced,
  };
}
