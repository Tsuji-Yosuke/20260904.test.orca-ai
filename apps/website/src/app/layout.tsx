import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import "./globals.css";
import { ComponentsSectionNavigation } from "@/components/components-section-navigation";
import { GlobalNav } from "@/components/global-nav";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { componentPages } from "@/lib/component-pages.server";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site-meta";

export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE_TITLE}`,
    default: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html
      lang="ja"
      data-theme="light"
      data-density="expressive"
      data-lang="ja"
      data-color-system="corporate"
    >
      <body>
        <a className="skip-link" href="#main-content">
          本文へ移動
        </a>
        <SiteHeader />
        <div className="flex min-h-[calc(100dvh-var(--website-header-height))] flex-col website-desktop:flex-row website-desktop:items-stretch website-desktop:pl-[var(--website-rail-width)]">
          <GlobalNav />
          <ComponentsSectionNavigation pages={componentPages()} />
          <div className="flex min-w-0 flex-1 flex-col">
            <main id="main-content" className="flex min-w-0 flex-1 flex-col bg-surface">
              {children}
            </main>
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
