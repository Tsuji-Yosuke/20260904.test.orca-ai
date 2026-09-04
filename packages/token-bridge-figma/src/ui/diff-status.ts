import type { DiffEntry } from "../core/types.js";

export function formatDiffStatus(entry: DiffEntry): string {
  if (entry.changeKind === "create") {
    return entry.details.missingSide === "repo" ? "Figma のみ" : "GitHub のみ";
  }

  if (entry.changeKind === "delete") {
    return entry.details.missingSide === "repo" ? "GitHub になし" : "Figma になし";
  }

  if (entry.changeKind === "conflict") {
    return "要確認";
  }

  if (entry.changeKind === "update") {
    return entry.details.preferredDirection === "repo-to-figma" ? "GitHub 更新" : "Figma 更新";
  }

  return "非対応";
}
