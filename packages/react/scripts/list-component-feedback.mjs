import { validateFeedbackRepository } from "./validate-component-feedback.mjs";

const STATUS_ORDER = new Map([
  ["new", 0],
  ["triaged", 1],
  ["accepted", 2],
  ["rejected", 3],
]);

function fit(value, width) {
  const text = String(value ?? "-");
  return text.length <= width ? text.padEnd(width) : `${text.slice(0, width - 1)}…`;
}

function printEntries(entries) {
  const widths = { status: 9, component: 18, category: 20, owner: 16, id: 34 };
  console.log(
    [
      fit("STATUS", widths.status),
      fit("COMPONENT", widths.component),
      fit("CATEGORY", widths.category),
      fit("OWNER", widths.owner),
      fit("ID", widths.id),
      "SUMMARY",
    ].join("  "),
  );
  for (const entry of entries) {
    console.log(
      [
        fit(entry.status, widths.status),
        fit(entry.component, widths.component),
        fit(entry.category, widths.category),
        fit(entry.triage?.owner, widths.owner),
        fit(entry.id, widths.id),
        entry.feedback?.summary ?? "-",
      ].join("  "),
    );
  }
}

const result = validateFeedbackRepository();
if (result.errors.length > 0) {
  console.error("component-feedback: 一覧表示前にデータエラーを修正してください");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const requestedStatuses = new Set(process.argv.slice(2));
  const entries = result.entries
    .filter(
      (entry) => requestedStatuses.size === 0 || requestedStatuses.has(entry.status),
    )
    .sort(
      (left, right) =>
        STATUS_ORDER.get(left.status) - STATUS_ORDER.get(right.status) ||
        left.submittedAt.localeCompare(right.submittedAt) ||
        left.id.localeCompare(right.id),
    );

  const counts = Object.fromEntries(
    ["new", "triaged", "accepted", "rejected"].map((status) => [
      status,
      result.entries.filter((entry) => entry.status === status).length,
    ]),
  );
  console.log(
    `component-feedback: new=${counts.new} triaged=${counts.triaged} accepted=${counts.accepted} rejected=${counts.rejected}`,
  );
  if (entries.length === 0) console.log("対象のFBはありません");
  else printEntries(entries);
}
