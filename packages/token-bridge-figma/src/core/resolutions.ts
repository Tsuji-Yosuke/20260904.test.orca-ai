import type { DiffEntry, DiffResolution } from "./types.js";

export function hasResolutionDirection(
  diffs: DiffEntry[],
  resolutions: Record<string, DiffResolution>,
  direction: Exclude<DiffResolution, "skip">
): boolean {
  return diffs.some((diff) => (resolutions[diff.resolutionId] ?? "skip") === direction);
}
