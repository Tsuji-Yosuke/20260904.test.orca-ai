import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const require = createRequire(import.meta.url);

/** pnpm workspace 内で別 major の Storybook が共存しても、この app の依存を解決する。 */
function getAbsolutePath(packageName: string): string {
  return dirname(require.resolve(`${packageName}/package.json`));
}

const reactSrcDir = new URL("../../../packages/react/src", import.meta.url)
  .pathname;

const config: StorybookConfig = {
  stories: ["../../../packages/react/src/**/*.stories.@(ts|tsx)"],
  addons: [getAbsolutePath("@storybook/addon-essentials")],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  viteFinal: async (config) => {
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@/registry/orca": reactSrcDir,
      },
    };
    return config;
  },
};

export default config;
