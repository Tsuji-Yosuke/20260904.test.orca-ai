// Playground の現在値から、利用者へ提示する JSX コード文字列を生成する純関数。
// React 非依存に保つ（vitest の node 環境で網羅テストする）。
import type { ControlDef, ControlValue, ControlValues, PlaygroundConfig } from "./types";

/** 親 toggle が OFF の children を除いた、いま有効なコントロールを列挙する。 */
export function activeControls(controls: ControlDef[], values: ControlValues): ControlDef[] {
  const active: ControlDef[] = [];
  for (const control of controls) {
    active.push(control);
    if (control.kind === "toggle" && values[control.prop] === true && control.children) {
      active.push(...activeControls(control.children, values));
    }
  }
  return active;
}

export function defaultValues(controls: ControlDef[]): ControlValues {
  const values: ControlValues = {};
  const walk = (defs: ControlDef[]) => {
    for (const def of defs) {
      values[def.prop] = def.defaultValue;
      if (def.kind === "toggle" && def.children) walk(def.children);
    }
  };
  walk(controls);
  return values;
}

function jsxChildren(value: ControlValue): string {
  const text = String(value);
  return /[<>{}&\r\n]/.test(text) ? `{${JSON.stringify(text)}}` : text;
}

export function generateJsx(config: PlaygroundConfig, values: ControlValues): string {
  const attrs: string[] = [];
  let children: string | null = null;

  for (const control of activeControls(config.controls, values)) {
    if (control.uiOnly) continue;
    const value = values[control.prop] ?? control.defaultValue;
    switch (control.kind) {
      case "select": {
        if (value !== control.defaultValue) attrs.push(`${control.prop}="${String(value)}"`);
        break;
      }
      case "text": {
        if (control.asChildren) {
          children = jsxChildren(value);
        } else if (value !== control.defaultValue) {
          attrs.push(`${control.prop}={${JSON.stringify(String(value))}}`);
        }
        break;
      }
      case "toggle": {
        if (value === true) {
          const jsx = control.jsxValues
            ? control.jsxValues.map[String(values[control.jsxValues.from])]
            : typeof control.jsxValue === "function"
              ? control.jsxValue(values)
              : control.jsxValue;
          attrs.push(jsx ? `${control.prop}={${jsx}}` : control.prop);
        } else if (control.defaultValue === true) {
          attrs.push(`${control.prop}={false}`);
        }
        break;
      }
    }
  }

  const attrText = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  const openTag = `<${config.component}${attrText}>`;
  const element =
    children === null
      ? `<${config.component}${attrText} />`
      : openTag.length > 60
        ? `<${config.component}\n${attrs.map((attr) => `  ${attr}`).join("\n")}\n>\n  ${children}\n</${config.component}>`
        : `${openTag}\n  ${children}\n</${config.component}>`;

  return [...config.imports, "", element, ""].join("\n");
}
