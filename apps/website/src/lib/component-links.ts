// コンポーネントページから外部リソースへのリンク。
const STORYBOOK_URL = "https://orca-storybook.pages.dev";

/** Storybook の Docs ページ（story id は "components-<name の - 抜き>--docs"）。 */
export function componentStorybookUrl(name: string): string {
  const storyId = `components-${name.replaceAll("-", "")}--docs`;
  return `${STORYBOOK_URL}/?path=/docs/${storyId}`;
}
