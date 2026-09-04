// Playground を持つコンポーネント名（component-meta の name）。
// サーバ側（layout / page）が client レジストリを import せずに有無を判定するための一覧。
// client 側レジストリ（registry.tsx の PLAYGROUNDS）とキーが一致することをテストで保証する。
export const PLAYGROUND_NAMES = ["button"] as const;

export function hasPlayground(name: string): boolean {
  return (PLAYGROUND_NAMES as readonly string[]).includes(name);
}
