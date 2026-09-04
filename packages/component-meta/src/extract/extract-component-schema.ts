// @orca/react の <Title>Props interface から、Playground 等が使う PropSchema を抽出する。
// 設計判断: interface の own members のみを対象にする。DOM 属性の継承
// （extends ButtonHTMLAttributes<...>）や Base UI 型の Omit を展開すると
// 数百 props の混入・欠落が起きる（docgen 系の既知の失敗パターン）。
// 継承由来で操作したい prop（Button の disabled 等）は利用側のオーバーレイで補完する。
import {
  Node,
  SyntaxKind,
  type InterfaceDeclaration,
  type PropertySignature,
  type SourceFile,
} from "ts-morph";
import type { ComponentSchema, PropKind, PropSchema } from "./schema-types";

export type { ComponentSchema, PropKind, PropSchema } from "./schema-types";

/** クォート付きキー（"aria-label" 等）を素の名前に正規化する。 */
function propName(prop: PropertySignature): string {
  return prop.getName().replace(/^["'](.*)["']$/, "$1");
}

/**
 * union 型の選択肢を「宣言の記述順」で返す。型チェッカの union は順序を保証しない
 * ため、型エイリアス宣言（export type XxxSize = "sm" | "md" | ...）または
 * インライン union の型ノードを辿って取り出す。全メンバーが文字列リテラルの
 * 場合のみ enum とみなし、それ以外は null。
 */
function unionOptionsFromTypeNode(prop: PropertySignature, sourceFile: SourceFile): string[] | null {
  let typeNode = prop.getTypeNode();
  if (!typeNode) return null;

  // 型参照（ButtonVariant 等）は同一ファイル内の型エイリアス宣言を辿る
  if (Node.isTypeReference(typeNode)) {
    const alias = sourceFile.getTypeAlias(typeNode.getTypeName().getText());
    if (!alias) return null;
    typeNode = alias.getTypeNode() ?? typeNode;
  }

  if (!Node.isUnionTypeNode(typeNode)) return null;
  const options: string[] = [];
  for (const member of typeNode.getTypeNodes()) {
    const literal = member.asKind(SyntaxKind.LiteralType)?.getLiteral();
    if (!literal || !Node.isStringLiteral(literal)) return null;
    options.push(literal.getLiteralValue());
  }
  return options.length > 0 ? options : null;
}

function kindOf(
  prop: PropertySignature,
  sourceFile: SourceFile,
): { kind: PropKind; options?: readonly string[] } {
  const type = prop.getType().getNonNullableType();

  // boolean は true | false の union になるため enum 判定より先に見る
  if (type.isBoolean() || type.isBooleanLiteral()) return { kind: "boolean" };

  const options = unionOptionsFromTypeNode(prop, sourceFile);
  if (options) return { kind: "enum", options };

  if (type.isString() || type.isStringLiteral()) return { kind: "string" };
  if (type.isNumber() || type.isNumberLiteral()) return { kind: "number" };

  const typeNodeText = prop.getTypeNode()?.getText() ?? "";
  if (/\bReactNode\b/.test(typeNodeText)) return { kind: "node" };

  return { kind: "other" };
}

/**
 * コンポーネント実装（forwardRef の render 引数、または関数宣言の第 1 引数）の
 * ObjectBindingPattern から、リテラルの分割代入デフォルトを集める。
 * このリポジトリでは全コンポーネントがこの形式で統一されている。
 */
function collectDefaultValues(
  sourceFile: SourceFile,
  displayName: string,
): Map<string, string | boolean | number> {
  const defaults = new Map<string, string | boolean | number>();
  const implementation =
    sourceFile.getFunction(displayName) ??
    sourceFile
      .getDescendantsOfKind(SyntaxKind.FunctionExpression)
      .find((candidate) => candidate.getName() === displayName);
  const binding = implementation?.getParameters()[0]?.getNameNode();
  if (!binding || !Node.isObjectBindingPattern(binding)) return defaults;

  for (const element of binding.getElements()) {
    const initializer = element.getInitializer();
    if (!initializer) continue;
    const name = element.getPropertyNameNode()?.getText() ?? element.getName();
    const key = name.replace(/^["'](.*)["']$/, "$1");
    if (Node.isStringLiteral(initializer)) {
      defaults.set(key, initializer.getLiteralValue());
    } else if (Node.isNumericLiteral(initializer)) {
      defaults.set(key, initializer.getLiteralValue());
    } else if (
      initializer.getKind() === SyntaxKind.TrueKeyword ||
      initializer.getKind() === SyntaxKind.FalseKeyword
    ) {
      defaults.set(key, initializer.getKind() === SyntaxKind.TrueKeyword);
    }
  }
  return defaults;
}

function jsdocOf(prop: PropertySignature): string | undefined {
  const text = prop
    .getJsDocs()
    .map((doc) => doc.getCommentText() ?? "")
    .join("\n")
    .trim();
  return text.length > 0 ? text : undefined;
}

export function extractComponentSchema(
  sourceFile: SourceFile,
  name: string,
  displayName: string,
): ComponentSchema {
  const interfaceName = `${displayName}Props`;
  const declaration: InterfaceDeclaration | undefined = sourceFile.getInterface(interfaceName);
  if (!declaration) {
    // 型エイリアス（例: CardProps = HTMLAttributes<HTMLDivElement>）は own props ゼロとして扱う。
    // どちらも無い場合は命名ずれの可能性が高いのでエラーにする（silent skip しない）。
    if (sourceFile.getTypeAlias(interfaceName)) {
      return { name, displayName, props: [] };
    }
    throw new Error(`${sourceFile.getBaseName()}: ${interfaceName} が見つかりません`);
  }

  const defaults = collectDefaultValues(sourceFile, displayName);
  const props: PropSchema[] = declaration.getProperties().map((prop) => {
    const key = propName(prop);
    const { kind, options } = kindOf(prop, sourceFile);
    const defaultValue = defaults.get(key);
    const jsdoc = jsdocOf(prop);
    return {
      name: key,
      kind,
      ...(options ? { options } : {}),
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      required: !prop.hasQuestionToken(),
      ...(jsdoc ? { jsdoc } : {}),
      typeText: prop.getTypeNode()?.getText() ?? prop.getType().getText(),
    };
  });

  return { name, displayName, props };
}
