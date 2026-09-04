import { describe, expect, it } from 'vitest';
import { evaluateUpdate, type LatestVersion } from './updateCheck';

/**
 * 更新判定 (evaluateUpdate) の回帰テスト。fetch を含まない純関数なので網羅的に検証する。
 * fetch・タイムアウト・dev ガードを含む checkForUpdate は __BUILD_NUMBER__ と実ネットワークに
 * 依存するため、Figma 実機 (CI ビルド) での確認に委ねる。
 */

/** テスト用の version.json を組み立てる (個別フィールドだけ上書き)。 */
function latest(over: Partial<LatestVersion> = {}): LatestVersion {
  return {
    buildNumber: 10,
    version: '1.2.3',
    minBuildNumber: 0,
    downloadUrl: 'https://github.com/orca-ds/orca/releases/tag/figma-linter-plugin-v0.1.1-build.33',
    ...over,
  };
}

describe('evaluateUpdate', () => {
  it('最新が自分より新しいと UpdateInfo を返す (forced=false)', () => {
    const info = evaluateUpdate(5, latest({ buildNumber: 10 }));
    expect(info).toEqual({
      version: '1.2.3',
      buildNumber: 10,
      downloadUrl: 'https://github.com/orca-ds/orca/releases/tag/figma-linter-plugin-v0.1.1-build.33',
      forced: false,
    });
  });

  it('同じビルド番号なら null (最新)', () => {
    expect(evaluateUpdate(10, latest({ buildNumber: 10 }))).toBeNull();
  });

  it('最新の方が古ければ null (ロールバック等)', () => {
    expect(evaluateUpdate(12, latest({ buildNumber: 10 }))).toBeNull();
  });

  it('自分が minBuildNumber を下回ると強制更新 (forced=true)', () => {
    const info = evaluateUpdate(5, latest({ buildNumber: 10, minBuildNumber: 8 }));
    expect(info?.forced).toBe(true);
  });

  it('minBuildNumber と同値なら強制しない (下回ったときだけ)', () => {
    const info = evaluateUpdate(5, latest({ buildNumber: 10, minBuildNumber: 5 }));
    expect(info?.forced).toBe(false);
  });

  it('minBuildNumber が壊れていても強制しない (fail-soft)', () => {
    const info = evaluateUpdate(5, latest({ buildNumber: 10, minBuildNumber: NaN }));
    expect(info?.forced).toBe(false);
  });

  it('version / downloadUrl が欠けても空文字で返す (クラッシュしない)', () => {
    const info = evaluateUpdate(
      5,
      { buildNumber: 10 } as LatestVersion,
    );
    expect(info).toEqual({ version: '', buildNumber: 10, downloadUrl: '', forced: false });
  });
});
