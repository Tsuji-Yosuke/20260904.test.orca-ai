"use client";

import { Button } from "@orca/react";

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-full"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export function ButtonUsage() {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-margin-2xl">
      <div className="flex w-full flex-wrap items-center justify-center gap-margin-2xl">
        <Button variant="primary">保存</Button>
        <Button variant="secondary">キャンセル</Button>
        <Button variant="ghost">詳細を見る</Button>
      </div>
      <div className="flex w-full flex-wrap items-center justify-center gap-margin-2xl">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
      <div className="flex w-full flex-wrap items-center justify-center gap-margin-2xl">
        <Button leadingIcon={<PlusIcon />}>追加</Button>
        <Button trailingIcon={<PlusIcon />}>次へ</Button>
        <Button disabled>無効</Button>
      </div>
    </div>
  );
}
