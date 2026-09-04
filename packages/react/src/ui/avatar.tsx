"use client";

import { forwardRef, type ReactNode } from "react";
import clsx from "clsx";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  /** 主体の画像 URL。 */
  src?: string;
  /** 主体の名前（アクセシブルネーム / イニシャル導出に使う）。 */
  name?: string;
  size?: AvatarSize;
  /** 画像が無い / 失敗時の代替。未指定なら name からイニシャルを表示。 */
  fallback?: ReactNode;
  /** 隣接ラベルで名前が提供済みなど、装飾として支援技術から隠す。 */
  decorative?: boolean;
  className?: string;
}

// Figma（node 7566:464）実測: 全 size で完全な円形のみ。角丸矩形 variant は存在しない。
const SIZE_CLASS: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: "size-component-full-sm", text: "typography-standard-title-small" },
  md: { box: "size-component-full-md", text: "typography-standard-title-medium" },
  lg: { box: "size-component-full-lg", text: "typography-standard-title-large" },
};

/** 名前からイニシャルを導出する。空白区切りが複数あれば各先頭、無ければ先頭2文字。 */
export function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, name, size = "md", fallback, decorative = false, className },
  ref,
) {
  const sizes = SIZE_CLASS[size];
  const fallbackContent =
    fallback ?? (name ? initialsFromName(name) : null);

  return (
    <BaseAvatar.Root
      ref={ref}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      data-size={size}
      className={clsx(
        "inline-flex items-center justify-center shrink-0 overflow-hidden align-middle select-none",
        "rounded-full border-md border-white bg-surface-dim text-primary",
        sizes.box,
        sizes.text,
        className,
      )}
    >
      {src && (
        <BaseAvatar.Image
          src={src}
          alt=""
          className="size-full object-cover"
        />
      )}
      <BaseAvatar.Fallback
        aria-hidden="true"
        className="inline-flex items-center justify-center size-full"
      >
        {fallbackContent}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
});

Avatar.displayName = "Avatar";
