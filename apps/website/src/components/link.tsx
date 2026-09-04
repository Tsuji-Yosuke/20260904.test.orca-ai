// サイト内リンク。ルーター実装（next/link）への依存をここに閉じ込める。
import NextLink from "next/link";
import type { ComponentProps } from "react";

export type LinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

export function Link(props: LinkProps) {
  return <NextLink {...props} />;
}
