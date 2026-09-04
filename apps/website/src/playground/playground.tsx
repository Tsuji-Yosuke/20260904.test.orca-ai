"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { PLAYGROUNDS } from "./registry";
import { defaultValues, generateJsx } from "./generate-jsx";
import type { ControlDef, ControlValues } from "./types";

function Control({
  def,
  values,
  onChange,
  nested = false,
}: {
  def: ControlDef;
  values: ControlValues;
  onChange: (prop: string, value: string | boolean) => void;
  nested?: boolean;
}) {
  const value = values[def.prop];
  const id = `control-${def.prop}`;
  const labelClass = "typography-standard-label-medium text-on-surface";
  const fieldClass =
    "h-component-full-sm w-full rounded-sm border-sm border-outline bg-surface px-padding-sm typography-standard-body-small focus-visible:outline-none focus-visible:shadow-focus-outline";

  if (def.kind === "toggle") {
    return (
      <div className={clsx(nested && "pl-padding-lg")}>
        <div className="flex items-center gap-margin-xl">
          <button
            type="button"
            role="switch"
            aria-label={def.label}
            aria-checked={value === true}
            onClick={() => onChange(def.prop, value !== true)}
            className={clsx(
              "relative h-component-half-lg w-[calc(var(--sizing-component-half-md)*2+var(--spacing-padding-3xs)*2)] rounded-full transition-colors hover:state-layer-24 focus-visible:outline-none focus-visible:shadow-focus-outline",
              value === true ? "bg-primary" : "bg-surface-container-dim",
            )}
          >
            <span
              aria-hidden
              className={clsx(
                "absolute left-padding-3xs top-padding-3xs size-component-half-md rounded-full bg-on-primary shadow-level-1 transition-transform",
                value === true && "translate-x-component-half-md",
              )}
            />
          </button>
          <span className={labelClass}>{def.label}</span>
        </div>
        {value === true && def.children ? (
          <div className="mt-margin-xl space-y-margin-xl">
            {def.children.map((child) => (
              <Control key={child.prop} def={child} values={values} onChange={onChange} nested />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "grid grid-cols-[7rem_1fr] items-center gap-margin-xl",
        nested && "pl-padding-lg",
      )}
    >
      <label htmlFor={id} className={labelClass}>
        {def.label}
      </label>
      {def.kind === "select" ? (
        <select
          id={id}
          value={String(value)}
          onChange={(event) => onChange(def.prop, event.target.value)}
          className={fieldClass}
        >
          {def.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={String(value)}
          onChange={(event) => onChange(def.prop, event.target.value)}
          className={fieldClass}
        />
      )}
    </div>
  );
}

export function Playground({ name }: { name: string }) {
  const config = PLAYGROUNDS[name];
  const [values, setValues] = useState<ControlValues>(() =>
    config ? defaultValues(config.controls) : {},
  );
  const code = useMemo(() => (config ? generateJsx(config, values) : ""), [config, values]);

  if (!config) {
    return (
      <p className="m-margin-lg rounded-md border-sm border-outline-dim bg-surface-container p-padding-lg typography-standard-body-small text-on-surface-dim">
        この コンポーネントの Playground は準備中。
      </p>
    );
  }

  const onChange = (prop: string, value: string | boolean) =>
    setValues((prev) => ({ ...prev, [prop]: value }));

  return (
    <div className="px-margin-lg py-padding-2xl">
      <div className="flex min-h-[var(--spacing-72)] items-center justify-center rounded-t-md border-sm border-b-0 border-outline-dim bg-placeholder bg-[radial-gradient(var(--color-disabled)_1px,transparent_1px)] [background-size:var(--sizing-lg)_var(--sizing-lg)] p-padding-2xl">
        {config.render(values)}
      </div>
      <details className="rounded-b-md border-sm border-outline-dim">
        <summary className="cursor-pointer select-none px-padding-lg py-padding-sm typography-standard-label-medium-bold focus-visible:outline-none focus-visible:shadow-focus-outline">
          コード
        </summary>
        <pre className="overflow-x-auto border-t-sm border-outline-dim bg-surface-container p-padding-lg font-mono text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      </details>
      <div className="mt-[var(--sizing-5xl)] grid grid-cols-1 gap-x-[var(--sizing-6xl)] gap-y-[var(--sizing-2xl)] md:grid-cols-2 xl:grid-cols-3">
        {config.controls.map((def) => (
          <Control key={def.prop} def={def} values={values} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}
