"use client";

import { forwardRef, type HTMLAttributes } from "react";
import clsx from "clsx";

export interface AvatarUnitProps extends HTMLAttributes<HTMLDivElement> {
  /** 重ねて並べる Avatar 群。重ね順・重なり量は AvatarUnit 側が決める。 */
  children: React.ReactNode;
}

/**
 * 複数の Avatar を横一列に、後続が先行に一部重なるように並べるグループ表示
 * （Figma node 9005:9563）。個々の Avatar の size / fallback は呼び出し側が決める。
 * グループ全体の意味づけ（role/aria-label 等）も呼び出し側の責務（原典 Open Questions）。
 */
export const AvatarUnit = forwardRef<HTMLDivElement, AvatarUnitProps>(
  function AvatarUnit({ children, className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        className={clsx(
          "inline-flex items-center",
          // Figma 実測: 後続の Avatar が先行の Avatar に -12px（--spacing-margin-xl）重なる。
          // 通常の DOM 順のペイントに従うため、後続ほど手前に描画される（Figma のレイヤー順と一致）。
          "[&>*:not(:first-child)]:-ml-margin-xl",
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

AvatarUnit.displayName = "AvatarUnit";
