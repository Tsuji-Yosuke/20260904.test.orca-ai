import { basename, resolve } from "node:path";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// JSON token ファイルを読み込み、以降の前処理で扱う plain object にする。
export function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

// DTCG token tree を深さ優先で走査し、$type を持つ leaf token だけを callback に渡す。
export function walkTokens(obj, callback, path = []) {
  if (!obj || typeof obj !== "object") return;
  if (obj.$type !== undefined) {
    callback(obj, path);
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    walkTokens(value, callback, [...path, key]);
  }
}

// Figma token path の PascalCase / 空白混じり名を CSS variable 向けの kebab-case にする。
export function cssVariableSlug(path) {
  const value = Array.isArray(path) ? path.join("-") : path;
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_.]+/g, "-")
    .toLowerCase();
}

// Terrazzo に渡す正規化済み token の出力先を、ビルド前に一度だけ空にする。
export function resetTokenBuildDirectory(tmpDir) {
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
}

// Figma API 由来の rgba object かどうかを判定する。
function isFigmaRgba(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.r === "number" &&
    typeof value.g === "number" &&
    typeof value.b === "number"
  );
}

// Figma の rgba object を Terrazzo/DTCG が扱える color object に変換する。
export function figmaRgbaToTerrazzoColor(value) {
  return {
    colorSpace: "srgb",
    components: [value.r, value.g, value.b],
    alpha: typeof value.a === "number" ? value.a : 1
  };
}

// Figma の number / dimension object を Terrazzo が要求する dimension object にそろえる。
export function figmaDimensionToTerrazzoDimension(value, fallbackUnit = "px") {
  if (typeof value === "number") {
    return { value, unit: fallbackUnit };
  }

  if (!value || typeof value !== "object" || typeof value.value !== "number") {
    return value;
  }

  if (value.unit === "PIXELS") {
    return { value: value.value, unit: "px" };
  }

  if (value.unit === "PERCENT") {
    return { value: value.value, unit: "%" };
  }

  return value;
}

// Figma text style の fontStyle から、Terrazzo typography 用の fontWeight 名を推定する。
function fontWeightFromStyle(fontStyle) {
  if (typeof fontStyle !== "string") return undefined;
  return fontStyle.toLowerCase().includes("bold") ? "bold" : "regular";
}

const tailwindLengthGroups = new Set([
  "Border",
  "Border radius",
  // Figma の typography reference group はスペース無し（FontSize / LetterSpacing）にリネームされた。
  // 旧名（Font Size / Letter Spacing）も移行期の安全のため残す。
  "Font Size",
  "FontSize",
  "Icon stroke width",
  "Letter Spacing",
  "LetterSpacing",
  "Padding",
  "Sizing",
  "Spacing"
]);

// density テーマとして扱うコレクション名。Expressive/Productive は
// 寸法・文字をまたいだ単一の切替軸（data-density）に寄せる。
const densityCollectionNames = new Set(["Expressive", "Productive"]);
// コレクション差し替え方式（2026-08 の Figma 再構成）: Expressive / Productive は
// 親情報（parentCollectionId）を持たない独立コレクションとして export されるようになった。
// 独立コレクションのまま Terrazzo に渡すと既定モードの値が :root を上書きするため、
// この表にある名前のコレクションは、同名変数を持つ既定コレクションへ名前で畳み込む。
const siblingThemeBaseCollectionName = {
  Expressive: "Dimension System",
  Productive: "Dimension System"
};
// Figma の言語 mode 名 → CSS の data-lang 値。言語を持たない mode（Default）は lang なし。
const languageCodeByModeName = { JP: "ja", EN: "en" };
// 「Color System」の子として extend される collection（Corporate 等）を data-color-system 軸に
// 寄せるための親コレクション名判定。完全一致のみ対応し、リネームされた場合は fallback に落ちる。
const colorSystemParentCollectionNames = new Set(["Color System"]);
// Figma の mode 名 → CSS の data-theme 複合値。Light（既定）は lookup 外 → 属性単独セレクタ
// （density×lang の「軸の既定値はセレクタに出さない」判断と同型）。
const themeAttrValueByModeName = { Dark: "dark" };

// extended collection の (コレクション名, mode名, 親コレクション名) から CSS セレクタを決める。
// density コレクション: data-density 軸。言語 mode を持つ場合は data-lang と複合する
//   （例 Expressive×JP → [data-density="expressive"][data-lang="ja"]、Default → [data-density="expressive"]）。
// color-system コレクション（親が「Color System」）: data-color-system 軸。Dark mode の場合は
//   data-theme と複合する（例 Corporate×Dark → [data-color-system="corporate"][data-theme="dark"]、
//   Light（既定）→ [data-color-system="corporate"]）。コレクション名は cssVariableSlug() で slug 化する。
// それ以外（親コレクションが未知）は従来どおり data-theme="<名>-<mode>" に fallback する
//   （現行 export に該当なし。新しい親コレクションの拡張が来たら、この関数に軸を追加設計すること）。
function extendedSelectorFor({ collectionName, modeName, parentCollectionName }) {
  if (densityCollectionNames.has(collectionName)) {
    const density = collectionName.toLowerCase();
    const lang = languageCodeByModeName[modeName];
    return lang
      ? `[data-density="${density}"][data-lang="${lang}"]`
      : `[data-density="${density}"]`;
  }
  if (colorSystemParentCollectionNames.has(parentCollectionName)) {
    const colorSystem = cssVariableSlug(collectionName);
    const themeAttr = themeAttrValueByModeName[modeName];
    return themeAttr
      ? `[data-color-system="${colorSystem}"][data-theme="${themeAttr}"]`
      : `[data-color-system="${colorSystem}"]`;
  }
  return `[data-theme="${collectionName}-${modeName}"]`;
}

// Tailwind theme に渡す長さ系 token path だけを dimension に変換するための判定。
function isTailwindLengthTokenPath(path) {
  return (
    tailwindLengthGroups.has(path[0]) ||
    path.at(-1) === "FontSize" ||
    path.at(-1) === "LetterSpacing"
  );
}

// Figma では文字列の Regular/Bold として来る font weight を CSS で使える数値にする。
function normalizeFontWeightValue(value) {
  if (typeof value !== "string") return value;
  const normalized = value.toLowerCase();
  if (normalized === "bold") return 700;
  if (normalized === "regular") return 400;
  return value;
}

// Tailwind 変数名で扱いやすいよう、Letter Spacing の負数 key を名前付き key に変える。
function renameNegativeLetterSpacingTokens(document) {
  // 旧名 "Letter Spacing" / 新名 "LetterSpacing" の双方を対象にする。
  const letterSpacing = document["LetterSpacing"] ?? document["Letter Spacing"];
  if (!letterSpacing || typeof letterSpacing !== "object") return;

  for (const key of Object.keys(letterSpacing)) {
    if (!key.startsWith("-")) continue;
    const nextKey = `Negative ${key.slice(1)}`;
    letterSpacing[nextKey] = letterSpacing[key];
    delete letterSpacing[key];
  }
}

// renameNegativeLetterSpacingTokens に合わせて、alias 参照内の負数 key も再書き換えする。
function normalizeAliasReferences(value) {
  if (typeof value === "string") {
    return value
      .replaceAll("{Letter Spacing.-", "{Letter Spacing.Negative ")
      .replaceAll("{LetterSpacing.-", "{LetterSpacing.Negative ");
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeAliasReferences(item));
  }

  if (!value || typeof value !== "object") return value;

  for (const [key, nestedValue] of Object.entries(value)) {
    value[key] = normalizeAliasReferences(nestedValue);
  }
  return value;
}

const tailwindThemePrefixByPath = {
  "border-width": "--border-width-",
  radius: "--radius-",
  spacing: "--spacing-"
};

const tailwindThemeNameRules = [
  { theme: "spacing", match: ["Padding"], drop: 1 },
  { theme: "spacing", match: ["Spacing", "Padding"], drop: 1 },
  { theme: "spacing", match: ["Spacing", "Margin"], drop: 1 },
  { theme: "spacing", match: ["Sizing", "Component"], drop: 1 },
  { theme: "spacing", match: ["Sizing", "Icon"], drop: 1 },
  { theme: "radius", match: ["Border radius"], drop: 1 },
  { theme: "radius", match: ["Sizing", "Radius"], drop: 2 },
  { theme: "border-width", match: ["Border"], drop: 1 },
  { theme: "border-width", match: ["Sizing", "Border"], drop: 2 }
];

function matchesTokenPathPrefix(tokenPath, prefix) {
  if (tokenPath.length <= prefix.length) return false;
  return prefix.every((segment, index) => tokenPath[index] === segment);
}

// パレット色のグループ名。@theme に露出する際、グループ名込みの変数名にして
// パレット間の段番号の衝突（Yellow.300 と Red.300 が両方 --color-300 になる）を防ぐ。
const paletteColorGroups = new Set([
  "Blue",
  "Cyan",
  "Gray",
  "Green",
  "Orange",
  "Purple",
  "Red",
  "Yellow"
]);

// Tailwind plugin が生成する変数名を補正し、冗長な Figma category prefix を落とす。
export function tailwindThemeVariableName(defaultName, context) {
  const tokenPath = context.token?.id?.split(".") ?? [];
  const themePath = context.path?.[0];

  if (themePath === "color") {
    // パレット色はグループ名込みで公開する（--color-yellow-300 等）
    if (paletteColorGroups.has(tokenPath[0]) && tokenPath.length >= 2) {
      return `--color-${cssVariableSlug(tokenPath)}`;
    }
    // 旧 Schemes/* は 3階層（Schemes/Group/Token）、新 UI/* と Brand/* は 2階層。
    // いずれも group prefix を落として末尾の token 名で公開する。
    // StateLayers 等それ以外は衝突を避けて explicit な既定名のまま。
    const isScheme = tokenPath[0] === "Schemes" && tokenPath.length >= 3;
    const isUiOrBrand = (tokenPath[0] === "UI" || tokenPath[0] === "Brand") && tokenPath.length >= 2;
    if (!isScheme && !isUiOrBrand) return defaultName;

    return `--color-${cssVariableSlug(tokenPath.at(-1))}`;
  }

  const prefix = tailwindThemePrefixByPath[themePath];
  if (!prefix) return defaultName;

  const rule = tailwindThemeNameRules.find(
    ({ theme, match }) => theme === themePath && matchesTokenPathPrefix(tokenPath, match)
  );
  if (rule) return `${prefix}${cssVariableSlug(tokenPath.slice(rule.drop))}`;

  return defaultName;
}

// Figma effect の drop/inner shadow object を Terrazzo shadow value に変換する。
export function normalizeFigmaEffect(effect) {
  return {
    color: isFigmaRgba(effect.color)
      ? figmaRgbaToTerrazzoColor(effect.color)
      : effect.color,
    offsetX: figmaDimensionToTerrazzoDimension(effect.offset?.x ?? 0),
    offsetY: figmaDimensionToTerrazzoDimension(effect.offset?.y ?? 0),
    blur: figmaDimensionToTerrazzoDimension(effect.radius ?? 0),
    spread: figmaDimensionToTerrazzoDimension(effect.spread ?? 0),
    inset: effect.type === "INNER_SHADOW"
  };
}

// Figma text style の typography value を Terrazzo が lint/build できる形に変換する。
export function normalizeFigmaTypography(value) {
  return {
    ...value,
    fontWeight: value.fontWeight ?? fontWeightFromStyle(value.fontStyle),
    fontSize: figmaDimensionToTerrazzoDimension(value.fontSize),
    lineHeight:
      value.lineHeight?.unit === "AUTO"
        ? "normal"
        : figmaDimensionToTerrazzoDimension(value.lineHeight),
    letterSpacing: figmaDimensionToTerrazzoDimension(value.letterSpacing),
    paragraphSpacing: figmaDimensionToTerrazzoDimension(value.paragraphSpacing),
    wordSpacing: figmaDimensionToTerrazzoDimension(value.wordSpacing)
  };
}

// style token document 全体を Terrazzo 向けに正規化する。shadow と typography を主に補正する。
export function normalizeStyleDocumentForTerrazzo(document) {
  const nextDocument = structuredClone(document);

  walkTokens(nextDocument, (token) => {
    if (token.$type === "shadow") {
      const value = Array.isArray(token.$value) ? token.$value : [token.$value];
      token.$value = value
        .filter((effect) => effect?.visible !== false)
        .map((effect) => normalizeFigmaEffect(effect));
    }

    if (token.$type === "typography" && token.$value && typeof token.$value === "object") {
      token.$value = normalizeFigmaTypography(token.$value);
    }
  });

  return nextDocument;
}

// Figma layout grid style は CSS/Tailwind 出力に不要なので Terrazzo 入力から除外する。
export function shouldIncludeStyleDocumentForTerrazzo(document) {
  return document?.$extensions?.figmaSync?.styleType !== "grid";
}

// variable token document 全体を Terrazzo/Tailwind 向けに正規化する。
export function normalizeVariableDocumentForTerrazzo(document) {
  const nextDocument = structuredClone(document);
  renameNegativeLetterSpacingTokens(nextDocument);

  walkTokens(nextDocument, (token, path) => {
    token.$value = normalizeAliasReferences(token.$value);
    if (token.$extensions?.mode) {
      token.$extensions.mode = normalizeAliasReferences(token.$extensions.mode);
    }

    if (path[0] === "Font Weight" || path[0] === "FontWeight" || path.at(-1) === "FontWeight") {
      token.$type = "number";
      token.$value = normalizeFontWeightValue(token.$value);

      if (token.$extensions?.mode) {
        for (const [modeName, value] of Object.entries(token.$extensions.mode)) {
          token.$extensions.mode[modeName] = normalizeFontWeightValue(value);
        }
      }
      return;
    }

    if (token.$type !== "number" || !isTailwindLengthTokenPath(path)) return;

    token.$type = "dimension";
    token.$value = figmaDimensionToTerrazzoDimension(token.$value);

    if (token.$extensions?.mode) {
      for (const [modeName, value] of Object.entries(token.$extensions.mode)) {
        token.$extensions.mode[modeName] = figmaDimensionToTerrazzoDimension(value);
      }
    }
  });

  return nextDocument;
}

// Extended Collection の値を mode entries として取り出す。単一モード export の $value 形式も吸収する。
function getExtendedModeEntries(extToken, extModes) {
  if (extToken.$extensions?.mode) {
    return Object.entries(extToken.$extensions.mode);
  }

  if (extModes.length > 0) {
    return extModes.map((mode) => [mode.name, extToken.$value]);
  }

  return [["Default", extToken.$value]];
}

/**
 * Extended Collection のモードを親コレクションに追加モードとしてマージする。
 * Figma plugin が親 collection と extended collection を別ファイルに出すため、
 * Terrazzo に渡す前に parent token の $extensions.mode へ戻す。
 * @returns マージ後のファイルパス一覧（tmp にコピー済み）
 */
export function mergeExtendedCollections(variableFiles, tmpDir) {
  const fileDataMap = new Map();
  for (const filePath of variableFiles) {
    fileDataMap.set(filePath, readJsonFile(filePath));
  }

  const parentFiles = new Map();
  const parentFilesByName = new Map();
  const extendedFiles = [];

  for (const [filePath, data] of fileDataMap) {
    const meta = data.$extensions?.figmaSync;
    if (!meta) continue;
    if (meta.parentCollectionId) {
      // 親子方式（Corporate、Typography の Expressive/Productive 等）
      extendedFiles.push({
        filePath,
        data,
        parentCollectionId: meta.parentCollectionId,
        collectionName: meta.name,
      });
    } else if (siblingThemeBaseCollectionName[meta.name]) {
      // 差し替え方式: 親情報は無いが、名前で既定コレクションに畳み込む
      extendedFiles.push({
        filePath,
        data,
        baseCollectionName: siblingThemeBaseCollectionName[meta.name],
        collectionName: meta.name,
      });
    } else {
      parentFiles.set(meta.collectionId, filePath);
      parentFilesByName.set(meta.name, filePath);
    }
  }

  const extendedModeSelectors = [];

  for (const ext of extendedFiles) {
    const parentFilePath = ext.parentCollectionId
      ? parentFiles.get(ext.parentCollectionId)
      : parentFilesByName.get(ext.baseCollectionName);
    if (!parentFilePath) continue;

    const parentData = fileDataMap.get(parentFilePath);
    const extModes = ext.data.$extensions?.figmaSync?.modes ?? [];

    walkTokens(ext.data, (extToken, tokenPath) => {
      let parentToken = parentData;
      for (const segment of tokenPath) {
        parentToken = parentToken?.[segment];
      }
      if (!parentToken) return;

      parentToken.$extensions ??= {};
      parentToken.$extensions.mode ??= {};

      for (const [modeName, value] of getExtendedModeEntries(extToken, extModes)) {
        const prefixedName = `${ext.collectionName}-${modeName}`;
        parentToken.$extensions.mode[prefixedName] = value;
      }
    });

    const parentCollectionName = parentData.$extensions?.figmaSync?.name;

    for (const mode of extModes) {
      const prefixedName = `${ext.collectionName}-${mode.name}`;
      extendedModeSelectors.push({
        mode: prefixedName,
        selectors: [
          extendedSelectorFor({
            collectionName: ext.collectionName,
            modeName: mode.name,
            parentCollectionName,
          }),
        ],
      });
    }
  }

  mkdirSync(tmpDir, { recursive: true });

  const outputPaths = [];
  const extendedFilePaths = new Set(extendedFiles.map((e) => e.filePath));

  for (const [filePath, data] of fileDataMap) {
    if (extendedFilePaths.has(filePath)) continue;
    const outPath = resolve(tmpDir, basename(filePath));
    writeFileSync(outPath, JSON.stringify(normalizeVariableDocumentForTerrazzo(data), null, 2));
    outputPaths.push(outPath);
  }

  return { outputPaths, extendedModeSelectors };
}

// style token ファイルを正規化して tmp に書き出し、Terrazzo に渡す入力 path を返す。
export function normalizeStyleFiles(styleFiles, tmpDir) {
  mkdirSync(tmpDir, { recursive: true });

  return styleFiles.flatMap((filePath) => {
    const sourceData = readJsonFile(filePath);
    if (!shouldIncludeStyleDocumentForTerrazzo(sourceData)) return [];

    const data = normalizeStyleDocumentForTerrazzo(sourceData);
    const outPath = resolve(tmpDir, basename(filePath));
    writeFileSync(outPath, JSON.stringify(data, null, 2));
    return [outPath];
  });
}
