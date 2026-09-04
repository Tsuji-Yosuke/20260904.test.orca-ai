/** 運用系のヘルパ (cli.ts から分離してテスト可能にする)。 */

import { TOKEN_EXPIRY_WARN_DAYS } from "./config";

/** PAT / Plan Access Token の失効が近ければ警告文を返す (問題なければ null)。 */
export function tokenExpiryWarning(
  expires: string | undefined,
  now: Date,
  warnDays: number = TOKEN_EXPIRY_WARN_DAYS,
): string | null {
  if (!expires) return null;
  const expiry = new Date(`${expires}T00:00:00Z`);
  if (Number.isNaN(expiry.getTime())) {
    return `FIGMA_TOKEN_EXPIRES (${expires}) が日付として読めません。YYYY-MM-DD で指定してください。`;
  }
  const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / 86_400_000);
  if (daysLeft < 0) {
    return `Figma トークンの登録失効日 (${expires}) を過ぎています。新しいトークンへ差し替えてください。`;
  }
  if (daysLeft <= warnDays) {
    return `Figma トークンが ${expires} (残り ${daysLeft} 日) で失効します。差し替えを依頼してください。`;
  }
  return null;
}
