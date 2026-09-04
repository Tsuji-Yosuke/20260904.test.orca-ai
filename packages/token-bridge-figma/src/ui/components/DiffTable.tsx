import { findCollectionById, findStyleById, findVariableById } from "../../core/selectors.js";
import type {
  DiffEntry,
  DiffResolution,
  StyleTokenDocument,
  SyncDocument,
  VariableTokenDocument
} from "../../core/types.js";
import { DiffRow } from "./DiffRow.js";

type Props = {
  diffs: DiffEntry[];
  resolutions: Record<string, DiffResolution>;
  figmaDocument?: SyncDocument;
  repoDocument?: SyncDocument;
  onResolutionChange: (id: string, value: DiffResolution) => void;
};

function formatObjectEntries(value: Record<string, unknown>): string {
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${formatValue(item)}`)
    .join(" / ");
}

function formatValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }

  if (!value || typeof value !== "object") {
    return "\u2014";
  }

  const record = value as Record<string, unknown>;

  if ("fontFamily" in record || "fontSize" in record) {
    const fontFamily = record.fontFamily ? String(record.fontFamily) : "";
    const fontSize = record.fontSize ? `${String(record.fontSize)}px` : "";
    const fontWeight = record.fontWeight ? String(record.fontWeight) : "";
    return [fontFamily, fontSize, fontWeight].filter(Boolean).join(" / ");
  }

  if ("color" in record || "offsetX" in record || "offsetY" in record || "blur" in record) {
    return formatObjectEntries(record);
  }

  return formatObjectEntries(record);
}

function formatEntityValue(entity: VariableTokenDocument | StyleTokenDocument | null): string {
  if (!entity) {
    return "\u2014";
  }
  return formatValue(entity.value);
}

function lookupEntityValue(document: SyncDocument | undefined, entry: DiffEntry): string {
  if (entry.entityKind === "collection") {
    const collection = findCollectionById(document, entry.figmaId);
    if (!collection) {
      return "\u2014";
    }
    return `${collection.name} / modes: ${collection.modes.map((mode) => mode.name).join(", ")}`;
  }
  if (entry.entityKind === "variable") {
    const collectionId = entry.details.collectionId as string | undefined;
    return formatEntityValue(findVariableById(document, entry.figmaId, collectionId)?.token ?? null);
  }
  return formatEntityValue(findStyleById(document, entry.figmaId));
}

export function DiffTable({ diffs, resolutions, figmaDocument, repoDocument, onResolutionChange }: Props) {
  return (
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Figma</th>
            <th>GitHub</th>
            <th>Status</th>
            <th>Resolution</th>
          </tr>
        </thead>
        <tbody>
          {diffs.length === 0 ? (
            <tr>
              <td colspan={6} class="cell-muted empty-state">
                まだ差分はありません。「対応表を更新」を押してください。
              </td>
            </tr>
          ) : (
            diffs.map((entry) => (
              <DiffRow
                key={entry.resolutionId}
                entry={entry}
                resolution={resolutions[entry.resolutionId] ?? "skip"}
                onResolutionChange={onResolutionChange}
                figmaValue={lookupEntityValue(figmaDocument, entry)}
                repoValue={lookupEntityValue(repoDocument, entry)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
