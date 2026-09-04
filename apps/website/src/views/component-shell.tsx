import type { ReactNode } from "react";
import { DocumentShell } from "@/components/document-shell";
import { TabNav } from "@/components/tab-nav";
import type { ComponentPage } from "@/lib/component-pages.server";

const BUTTON_DESCRIPTION =
  "ボタンは、ユーザーの操作を促すアクション要素です。クリックやタップによってフォーム送信や遷移などを実行します。アクションの重要度に応じて、Filled・Outlined・Ghostを使い分け、視覚的コントラストを保ってください。";

export interface ComponentShellProps {
  page: ComponentPage;
  figmaUrl?: string;
  storybookUrl: string;
  hasPlayground: boolean;
}

/** コンポーネントページ共通の見出し（DocumentShell）と Overview / Playground のタブ。 */
export function ComponentShell({
  page,
  figmaUrl,
  storybookUrl,
  hasPlayground,
  children,
}: ComponentShellProps & { children: ReactNode }) {
  return (
    <DocumentShell
      title={page.title}
      description={page.name === "button" ? BUTTON_DESCRIPTION : page.description}
      version={page.name === "button" ? "v0.0.1" : undefined}
      updated={page.name === "button" ? "2026/07/11" : undefined}
      figmaUrl={figmaUrl}
      storybookUrl={storybookUrl}
    >
      <TabNav
        items={[
          { href: `/components/${page.name}`, label: "Overview", available: true },
          { href: `/components/${page.name}/playground`, label: "Playground", available: hasPlayground },
        ]}
      />

      {children}
    </DocumentShell>
  );
}
