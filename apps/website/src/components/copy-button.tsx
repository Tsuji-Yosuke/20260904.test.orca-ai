"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="rounded-sm border-sm border-outline px-padding-sm py-padding-2xs typography-standard-label-small hover:state-layer-8 focus-visible:outline-none focus-visible:shadow-focus-outline"
    >
      {copied ? "コピーしました" : "コピー"}
    </button>
  );
}
