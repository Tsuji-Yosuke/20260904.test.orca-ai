"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Header 右端に置く単一の操作要素（40px 四方。Figma の Header Slot）。IconButton など。 */
  action?: ReactNode;
}

// Figma（node 9481:8874）実測: variant 軸は hasImage / hasContextMenu の2つのみ。
// State variant（Hover/Focused/Selected 等）は存在せず、emphasis / size / href・onClick による
// インタラクティブ化は Figma に存在しないため実装しない（ユーザー裁定済み）。
const CardRoot = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={clsx(
        "overflow-hidden rounded-lg border-sm border-outline-bright bg-surface",
        className,
      )}
    />
  );
});
CardRoot.displayName = "Card";

const CardMedia = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardMedia({ className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        data-card-slot="media"
        className={clsx("[&_img]:block [&_img]:w-full [&_img]:object-cover", className)}
      />
    );
  },
);
CardMedia.displayName = "Card.Media";

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { action, className, children, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      data-card-slot="header"
      className={clsx(
        "flex items-start gap-padding-xs px-padding-lg pt-padding-lg pb-padding-xs",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-padding-2xs">{children}</div>
      {action != null && (
        <div
          data-card-slot="header-action"
          className="flex size-component-full-sm shrink-0 items-center justify-center"
        >
          {action}
        </div>
      )}
    </div>
  );
});
CardHeader.displayName = "Card.Header";

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...rest }, ref) {
    return (
      <h3
        {...rest}
        ref={ref}
        className={clsx("typography-standard-title-medium-bold text-primary", className)}
      />
    );
  },
);
CardTitle.displayName = "Card.Title";

const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...rest }, ref) {
  return (
    <p
      {...rest}
      ref={ref}
      className={clsx("typography-standard-body-medium text-on-surface", className)}
    />
  );
});
CardDescription.displayName = "Card.Description";

const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardBody({ className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        data-card-slot="body"
        className={clsx("px-padding-lg py-padding-xs", className)}
      />
    );
  },
);
CardBody.displayName = "Card.Body";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        data-card-slot="footer"
        className={clsx("px-padding-lg pt-padding-xs pb-padding-lg", className)}
      />
    );
  },
);
CardFooter.displayName = "Card.Footer";

export const Card = Object.assign(CardRoot, {
  Media: CardMedia,
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Body: CardBody,
  Footer: CardFooter,
});
