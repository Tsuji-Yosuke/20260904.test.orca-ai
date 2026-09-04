// values → props を組み立てる汎用 render。フラットなコンポーネントは
// これで per-component の render 手書きを不要にする。compound 系は
// definePlayground の overrides.render で従来どおり手書きする。
import { createElement, type ComponentType, type ReactNode } from "react";
import { activeControls } from "./generate-jsx";
import type { ControlDef, ControlValues } from "./types";

export type PropMapper = (values: ControlValues) => unknown;

export function createGenericRender(
  component: ComponentType<Record<string, unknown>>,
  controls: ControlDef[],
  propMappers: Record<string, PropMapper>,
): (values: ControlValues) => ReactNode {
  return (values) => {
    const props: Record<string, unknown> = {};
    let children: ReactNode;
    for (const control of activeControls(controls, values)) {
      if (control.uiOnly) continue;
      const value = values[control.prop] ?? control.defaultValue;
      switch (control.kind) {
        case "select":
        case "text": {
          if (control.kind === "text" && control.asChildren) {
            children = String(value);
          } else {
            props[control.prop] = value;
          }
          break;
        }
        case "toggle": {
          if (control.jsxValue || control.jsxValues) {
            const mapper = propMappers[control.prop];
            if (!mapper) {
              throw new Error(
                `propMappers.${control.prop} がありません（JSX 値付き toggle には必須）`,
              );
            }
            props[control.prop] = value === true ? mapper(values) : undefined;
          } else {
            props[control.prop] = value === true;
          }
          break;
        }
      }
    }
    return createElement(component, props, children);
  };
}
