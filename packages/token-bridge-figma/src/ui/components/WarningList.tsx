import type { FigmaSyncWarning } from "../../core/types.js";

type Props = {
  warnings: FigmaSyncWarning[];
};

export function WarningList({ warnings }: Props) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div class="warning-list">
      {warnings.map((warning, i) => (
        <div class="warning-item" key={i}>
          <strong>{warning.name}</strong>
          <br />
          <span class="warning-reason">{warning.reason}</span>
        </div>
      ))}
    </div>
  );
}
