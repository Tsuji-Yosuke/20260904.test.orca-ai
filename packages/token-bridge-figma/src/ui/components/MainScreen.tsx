import type { DiffEntry } from "../../core/types.js";
import { post } from "../messaging.js";
import { state, updateResolution } from "../state.js";
import { DiffTable } from "./DiffTable.js";
import { StatusBar } from "./StatusBar.js";
import { WarningList } from "./WarningList.js";

type Props = {
  onOpenConfig: () => void;
};

function summarizeDiffs(diffs: DiffEntry[]) {
  return diffs.reduce(
    (summary, diff) => {
      summary.total += 1;

      if (diff.changeKind === "unsupported") {
        summary.unsupported += 1;
        return summary;
      }

      if (diff.changeKind === "create" && diff.details.missingSide === "repo") {
        summary.figmaOnly += 1;
        return summary;
      }

      if (diff.changeKind === "create" && diff.details.missingSide === "figma") {
        summary.repoOnly += 1;
        return summary;
      }

      summary.review += 1;
      return summary;
    },
    { total: 0, figmaOnly: 0, repoOnly: 0, review: 0, unsupported: 0 }
  );
}

export function MainScreen({ onOpenConfig }: Props) {
  const { diffs, resolutions, figmaDocument, repoDocument, status, pullRequest, config } =
    state.value;

  const diffSummary = summarizeDiffs(diffs);

  const handleRefreshDiff = () => {
    post({ type: "refresh-diff", config });
  };

  const handleApplySelected = () => {
    post({ type: "apply-selected", config, resolutions });
  };

  return (
    <main class="screen screen-main">
      {status && <StatusBar status={status} pullRequest={pullRequest} />}

      <div class="row row-between">
        <div class="summary">
          差分 {diffSummary.total} / Figma のみ {diffSummary.figmaOnly} / GitHub のみ{" "}
          {diffSummary.repoOnly} / 要確認 {diffSummary.review} / 非対応{" "}
          {diffSummary.unsupported}
        </div>
        <button class="btn" onClick={onOpenConfig}>
          設定
        </button>
      </div>

      <div class="row">
        <button class="btn btn-accent" onClick={handleRefreshDiff}>
          対応表を更新
        </button>
      </div>

      {figmaDocument && <WarningList warnings={figmaDocument.warnings} />}
      {repoDocument && <WarningList warnings={repoDocument.warnings} />}

      <DiffTable
        diffs={diffs}
        resolutions={resolutions}
        figmaDocument={figmaDocument}
        repoDocument={repoDocument}
        onResolutionChange={updateResolution}
      />

      <div class="footer-bar">
        <button class="btn btn-danger" onClick={handleApplySelected}>
          選択した対応を適用
        </button>
      </div>
    </main>
  );
}
