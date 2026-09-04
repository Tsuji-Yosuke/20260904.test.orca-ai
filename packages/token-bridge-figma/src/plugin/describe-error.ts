/**
 * 投げられた値を人間が読める文字列に変換する。
 *
 * Figma Plugin API はときに Error ではなくプレーンなオブジェクトや文字列を
 * reject する。これらを握りつぶして "Unknown plugin error" にしてしまうと
 * 真因が分からなくなるため、可能な限り中身を残す。
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") {
        return json;
      }
    } catch {
      // 循環参照などで JSON 化できない場合は String() にフォールバック
    }
  }
  return `Unknown plugin error: ${String(error)}`;
}
