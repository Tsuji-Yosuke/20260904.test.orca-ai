import type { Preview } from "@storybook/react";
import { mountAgentation } from "./agentation";
import "./preview.css";

// UI へのフィードバックを AI エージェント向けの構造化テキストにする開発用ツール。
// 静的ビルドには含めたくないので dev サーバーのときだけ立ち上げる。
if (import.meta.env.DEV) {
  mountAgentation();
}

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    controls: { expanded: true },
  },
  globalTypes: {
    theme: {
      description: "data-theme on <html>",
      defaultValue: "light",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "light", title: "light" },
          { value: "dark", title: "dark" },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: "data-density on <html> (Expressive / Productive テーマ)",
      defaultValue: "expressive",
      toolbar: {
        icon: "ruler",
        items: [
          { value: "expressive", title: "expressive" },
          { value: "productive", title: "productive" },
        ],
        dynamicTitle: true,
      },
    },
    lang: {
      description: "data-lang on <html> (Typography 言語)",
      defaultValue: "ja",
      toolbar: {
        icon: "globe",
        items: [
          { value: "ja", title: "ja" },
          { value: "en", title: "en" },
        ],
        dynamicTitle: true,
      },
    },
    colorSystem: {
      description: "data-color-system on <html> (Color System 拡張)",
      defaultValue: "default",
      toolbar: {
        icon: "contrast",
        items: [
          { value: "default", title: "default" },
          { value: "corporate", title: "corporate" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme ?? "light";
      document.documentElement.dataset.density = context.globals.density ?? "expressive";
      document.documentElement.dataset.lang = context.globals.lang ?? "ja";
      const colorSystem = context.globals.colorSystem ?? "default";
      if (colorSystem === "default") {
        // default 用セレクタは存在しないため、属性を消して :root の既定値に戻す
        delete document.documentElement.dataset.colorSystem;
      } else {
        document.documentElement.dataset.colorSystem = colorSystem;
      }
      return Story();
    },
  ],
};

export default preview;
