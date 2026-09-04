import type { PullRequestResult } from "../../core/types.js";

type Props = {
  status: { level: "info" | "success" | "warning"; message: string };
  pullRequest: PullRequestResult | null;
};

export function StatusBar({ status, pullRequest }: Props) {
  const toneClass =
    status.level === "success"
      ? "status-success"
      : status.level === "warning"
        ? "status-warning"
        : "status-info";

  const showPrLink =
    status.level === "success" && status.message.includes("PR #") && pullRequest;

  return (
    <div class={`status ${toneClass}`}>
      <div class="row row-between pr-row">
        <div>{status.message}</div>
        {showPrLink && (
          <a href={pullRequest.html_url} target="_blank" rel="noreferrer" class="btn">
            GitHub で開く
          </a>
        )}
      </div>
    </div>
  );
}
