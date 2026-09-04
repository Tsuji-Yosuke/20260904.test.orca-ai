import type { DiffEntry, DiffResolution } from "../../core/types.js";
import { formatDiffStatus } from "../diff-status.js";

type Props = {
  entry: DiffEntry;
  resolution: DiffResolution;
  onResolutionChange: (id: string, value: DiffResolution) => void;
  figmaValue: string;
  repoValue: string;
};

export function DiffRow({ entry, resolution, onResolutionChange, figmaValue, repoValue }: Props) {
  return (
    <tr>
      <td>
        <strong>{entry.displayName}</strong>
        <br />
        <span class="secondary">{entry.jsonPath}</span>
      </td>
      <td class="cell-muted">{entry.entityKind}</td>
      <td>{figmaValue}</td>
      <td>{repoValue}</td>
      <td class="cell-muted">{formatDiffStatus(entry)}</td>
      <td>
        <select
          class="select"
          value={resolution}
          onChange={(e) =>
            onResolutionChange(
              entry.resolutionId,
              (e.target as HTMLSelectElement).value as DiffResolution
            )
          }
        >
          <option value="skip">Skip</option>
          <option value="figma-to-repo">Figma → GitHub</option>
          <option value="repo-to-figma">GitHub → Figma</option>
        </select>
      </td>
    </tr>
  );
}
