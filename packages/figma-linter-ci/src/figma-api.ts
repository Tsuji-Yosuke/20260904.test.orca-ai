/**
 * Figma REST API クライアント (このランナーが使う 2 エンドポイントだけ)。
 * 認証は X-Figma-Token ヘッダ (PAT / Plan Access Token どちらも同じ渡し方なので、
 * トークン種別の切替は Secrets の差し替えだけで済む)。
 */

import type { RestFileResponse, RestVariablesResponse } from "./rest-types";

const API_BASE = "https://api.figma.com";

/** 429 / 5xx をリトライする最大回数。定期バッチなので控えめで良い。 */
const MAX_RETRIES = 3;

export class FigmaApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, token: string): Promise<T> {
  let lastError: FigmaApiError | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        headers: { "X-Figma-Token": token },
      });
    } catch (error) {
      // ネットワーク断はリトライ対象。
      lastError = new FigmaApiError(
        `Figma API へ接続できません: ${error instanceof Error ? error.message : String(error)}`,
        null,
      );
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      return (await res.json()) as T;
    }
    // 429 は Retry-After を尊重 (上限 60 秒 — 極端な値でジョブを時間単位で止めない)、
    // 5xx は指数バックオフ。4xx (認証・権限・404) は即失敗。
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      lastError = new FigmaApiError(`Figma API ${res.status}: ${path}`, res.status);
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter, 60) * 1000
          : 2000 * (attempt + 1);
      await sleep(waitMs);
      continue;
    }
    const body = await res.text().catch(() => "");
    throw new FigmaApiError(
      `Figma API ${res.status}: ${path}${body ? ` — ${body.slice(0, 200)}` : ""}` +
        (res.status === 403
          ? " (トークンのスコープに file 読取 / file_variables:read が含まれているか確認してください)"
          : ""),
      res.status,
    );
  }
  throw lastError ?? new FigmaApiError(`Figma API リトライ上限超過: ${path}`, null);
}

/** ファイル本体 (全ページのノードツリー) を取得する。 */
export async function fetchFile(fileKey: string, token: string): Promise<RestFileResponse> {
  return request<RestFileResponse>(`/v1/files/${fileKey}`, token);
}

/** ローカル Variables (コレクション + 変数 + モード値) を取得する。Enterprise プラン限定。 */
export async function fetchLocalVariables(
  fileKey: string,
  token: string,
): Promise<RestVariablesResponse> {
  return request<RestVariablesResponse>(`/v1/files/${fileKey}/variables/local`, token);
}
