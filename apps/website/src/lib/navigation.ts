export type NavigationIconName = "home" | "get-started" | "foundation" | "components";

export interface GlobalNavigationItem {
  href: string;
  label: string;
  icon: NavigationIconName;
}

export const GLOBAL_NAVIGATION: GlobalNavigationItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/get-started", label: "Get started", icon: "get-started" },
  { href: "/foundation", label: "Foundation", icon: "foundation" },
  { href: "/components/button", label: "Components", icon: "components" },
];

export function navigationItemIsActive(pathname: string, href: string): boolean {
  if (href === "/components/button") return pathname === "/components" || pathname.startsWith("/components/");
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function navigationSection(pathname: string): GlobalNavigationItem | undefined {
  return GLOBAL_NAVIGATION.find((item) => navigationItemIsActive(pathname, item.href));
}
