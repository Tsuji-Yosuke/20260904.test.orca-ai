import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';

const require = createRequire(import.meta.url);

/** pnpm workspace 内で別 major の Storybook が共存しても、この package の依存を解決する。 */
function getAbsolutePath(packageName: string): string {
  return dirname(require.resolve(`${packageName}/package.json`));
}

/**
 * Storybook config. Renders the plugin's React UI outside Figma so components and
 * panels can be built and reviewed in a plain browser. The Vite builder transpiles
 * the same TSX/CSS the esbuild plugin build uses, and @vitejs/plugin-react (a
 * devDependency) is auto-applied by @storybook/react-vite for the automatic JSX runtime.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-themes'),
  ],
  framework: { name: getAbsolutePath('@storybook/react-vite'), options: {} },
  // No external network is needed to develop the UI; keep Storybook offline-friendly.
  core: { disableTelemetry: true },
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import('vite');
    return mergeConfig(viteConfig, {
      plugins: [
        // src/ui/messaging.ts bridges the UI to Figma's main thread over postMessage,
        // which doesn't exist in a browser. Only for App.tsx, redirect its `./messaging`
        // import to an in-memory mock so the full App story is interactive outside Figma.
        {
          name: 'figma-messaging-mock',
          enforce: 'pre' as const,
          resolveId(source: string, importer?: string) {
            const from = importer?.replace(/\\/g, '/').split('?')[0];
            // App.tsx と src/ui/ 配下の各画面 (screens/*) からの messaging import を
            // ブラウザ用のインメモリ mock に差し替える (App は `./messaging`、画面は `../messaging`)。
            const isMessaging = source === './messaging' || source === '../messaging';
            if (isMessaging && from && /\/src\/ui\//.test(from)) {
              return resolve(process.cwd(), '.storybook/figma-messaging.mock.ts');
            }
            return null;
          },
        },
      ],
    });
  },
};

export default config;
