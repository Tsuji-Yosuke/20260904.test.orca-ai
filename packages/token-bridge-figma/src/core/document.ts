import type {
  SyncDocument,
  SyncStyleType
} from "./types.js";

export const STYLE_TYPES: SyncStyleType[] = ["paint", "text", "effect", "grid"];

export function createEmptySyncDocument(): SyncDocument {
  return {
    variables: [],
    styles: {
      paint: [],
      text: [],
      effect: [],
      grid: []
    },
    warnings: []
  };
}

export function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneDocument(document: SyncDocument): SyncDocument {
  return cloneValue(document);
}

export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-|-$/g, "");
}

export function splitTokenPath(name: string): string[] {
  return name
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function pathToReference(path: string[]): string {
  return `{${path.join(".")}}`;
}

export function referenceToPath(reference: string): string[] {
  return reference.replace(/^\{|\}$/g, "").split(".").filter(Boolean);
}

export function isReferenceValue(value: unknown): value is string {
  return typeof value === "string" && /^\{.+\}$/.test(value);
}

export function styleTokenType(styleType: SyncStyleType): "color" | "typography" | "shadow" | "other" {
  switch (styleType) {
    case "paint":
      return "color";
    case "text":
      return "typography";
    case "effect":
      return "shadow";
    default:
      return "other";
  }
}

export function variableResolvedTypeToTokenType(
  resolvedType: VariableResolvedDataType
): "color" | "number" | "string" | "boolean" | "unknown" {
  switch (resolvedType) {
    case "COLOR":
      return "color";
    case "FLOAT":
      return "number";
    case "STRING":
      return "string";
    case "BOOLEAN":
      return "boolean";
    default:
      return "unknown";
  }
}

export function tokenTypeToVariableResolvedType(tokenType: string): VariableResolvedDataType {
  switch (tokenType) {
    case "color":
      return "COLOR";
    case "number":
      return "FLOAT";
    case "boolean":
      return "BOOLEAN";
    case "string":
    default:
      return "STRING";
  }
}
