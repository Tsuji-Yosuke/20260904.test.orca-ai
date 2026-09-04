import type { ReactNode } from "react";

export function FoundationDocPage({ body }: { body: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl space-y-margin-2xl px-margin-lg py-padding-2xl">
      {body}
    </article>
  );
}
