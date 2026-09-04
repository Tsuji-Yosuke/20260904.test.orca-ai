"use client";

import { Button } from "@orca/react";
import type { ComponentType } from "react";
import { definePlayground } from "@/playground/define-playground";
import { PLAYGROUND_ICONS } from "@/playground/icons";

// variant / size は TS 型（ButtonProps）から自動導出される。
// ここに書くのは型から分からないものだけ: 継承由来の disabled、children、
// ReactNode である前後アイコンの写像。
export const buttonPlayground = definePlayground("button", {
  component: Button as ComponentType<Record<string, unknown>>,
  extraControls: [
    { kind: "text", prop: "children", label: "Label", defaultValue: "ラベル", asChildren: true },
    { kind: "toggle", prop: "disabled", label: "Disabled", defaultValue: false },
    {
      kind: "toggle",
      prop: "leadingIcon",
      label: "Show Leading Icon",
      defaultValue: false,
      jsxValues: { from: "leadingIconName", map: { plus: "<PlusIcon />", arrow: "<ArrowIcon />" } },
      children: [
        {
          kind: "select",
          prop: "leadingIconName",
          label: "Leading Icon",
          options: ["plus", "arrow"],
          defaultValue: "plus",
          uiOnly: true,
        },
      ],
    },
    {
      kind: "toggle",
      prop: "trailingIcon",
      label: "Show Trailing Icon",
      defaultValue: false,
      jsxValues: { from: "trailingIconName", map: { plus: "<PlusIcon />", arrow: "<ArrowIcon />" } },
      children: [
        {
          kind: "select",
          prop: "trailingIconName",
          label: "Trailing Icon",
          options: ["arrow", "plus"],
          defaultValue: "arrow",
          uiOnly: true,
        },
      ],
    },
  ],
  order: ["variant", "size", "children", "disabled", "leadingIcon", "trailingIcon"],
  propMappers: {
    leadingIcon: (values) => PLAYGROUND_ICONS[String(values["leadingIconName"])],
    trailingIcon: (values) => PLAYGROUND_ICONS[String(values["trailingIconName"])],
  },
});
