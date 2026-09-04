/** 違反ノードへ飛べる Figma URL (node-id は "1:23" → "1-23" 形式)。 */
export function figmaNodeUrl(fileKey: string, nodeId: string): string {
  return `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(nodeId.replace(/:/g, "-"))}`;
}
