import { cloneDocument } from "./document.js";
import { findCollectionById, findStyleById, findVariableById } from "./selectors.js";
import { serializeSyncDocumentToRepoFiles } from "./serialize.js";
import type { DiffEntry, DiffResolution, SyncDocument, SyncStyleType } from "./types.js";

function markSelectionAsSynced(document: SyncDocument, diff: DiffEntry): void {
  if (diff.entityKind === "collection") {
    const collection = findCollectionById(document, diff.figmaId);
    if (collection) {
      collection.extensions.figmaSync.syncedHash = collection.extensions.figmaSync.updatedHash;
    }
    return;
  }

  if (diff.entityKind === "variable") {
    const collectionId = diff.details.collectionId as string | undefined;
    const match = findVariableById(document, diff.figmaId, collectionId);
    if (match) {
      match.token.extensions.figmaSync.syncedHash = match.token.extensions.figmaSync.updatedHash;
    }
    return;
  }

  const style = findStyleById(document, diff.figmaId);
  if (style) {
    style.extensions.figmaSync.syncedHash = style.extensions.figmaSync.updatedHash;
  }
}

function markDocumentAsSynced(document: SyncDocument): SyncDocument {
  const nextDocument = cloneDocument(document);

  for (const collection of nextDocument.variables) {
    collection.extensions.figmaSync.syncedHash = collection.extensions.figmaSync.updatedHash;
    for (const token of collection.tokens) {
      token.extensions.figmaSync.syncedHash = token.extensions.figmaSync.updatedHash;
    }
  }

  for (const styleType of Object.keys(nextDocument.styles) as SyncStyleType[]) {
    for (const style of nextDocument.styles[styleType]) {
      style.extensions.figmaSync.syncedHash = style.extensions.figmaSync.updatedHash;
    }
  }

  return nextDocument;
}

export interface PullRequestFiles {
  files: Record<string, string>;
  /** repo にあるが今回の出力に含まれない古いファイル（#23）。PR で削除する。 */
  deletePaths: string[];
}

export function buildPullRequestFiles({
  document,
  targetDir,
  diffs,
  resolutions,
  repoFiles
}: {
  document: SyncDocument;
  targetDir: string;
  diffs?: DiffEntry[];
  resolutions?: Record<string, DiffResolution>;
  /** 現在の base branch 上の同期対象ファイル。渡すと、残り続ける古いファイルの削除パスを計算する（#23）。 */
  repoFiles?: Record<string, string>;
}): PullRequestFiles {
  if (!diffs || !resolutions) {
    const files = serializeSyncDocumentToRepoFiles(markDocumentAsSynced(document), targetDir);
    return {
      files,
      deletePaths: repoFiles
        ? computeLeftoverRepoFilePaths({ repoFiles, nextFiles: files, document })
        : []
    };
  }

  const nextDocument = cloneDocument(document);
  const includeCollectionIds = new Set<string>();
  const includeStyleTypes = new Set<SyncStyleType>();

  for (const diff of diffs) {
    if ((resolutions[diff.resolutionId] ?? "skip") !== "figma-to-repo") {
      continue;
    }

    markSelectionAsSynced(nextDocument, diff);

    if (diff.entityKind === "collection") {
      includeCollectionIds.add(diff.figmaId);
      continue;
    }

    if (diff.entityKind === "variable") {
      const collectionId = diff.details.collectionId as string | undefined;
      const match = findVariableById(nextDocument, diff.figmaId, collectionId);
      if (match) {
        includeCollectionIds.add(match.collection.extensions.figmaSync.collectionId);
      } else if (collectionId) {
        // figma-to-repo の delete diff は、除去後の nextDocument からは
        // 対象の variable を検索できない（既に消えているため）。diff が
        // 保持している collectionId を直接使うことで、削除だけがコレクション内
        // 唯一の変更でも当該コレクションのファイルを再生成対象に含める。
        includeCollectionIds.add(collectionId);
      }
      continue;
    }

    const style = findStyleById(nextDocument, diff.figmaId);
    if (style) {
      includeStyleTypes.add(style.styleType);
    } else {
      // style も同様に、削除後の nextDocument からは見つからない。
      // diff.details.styleType（diff.ts が delete 差分に埋め込む）を使う。
      const styleType = diff.details.styleType as SyncStyleType | undefined;
      if (styleType) {
        includeStyleTypes.add(styleType);
      }
    }
  }

  const files = serializeSyncDocumentToRepoFiles(nextDocument, targetDir, {
    includeCollectionIds,
    includeStyleTypes
  });
  return {
    files,
    deletePaths: repoFiles
      ? computeLeftoverRepoFilePaths({ repoFiles, nextFiles: files, document: nextDocument, includeCollectionIds })
      : []
  };
}

// #23: コレクションをリネーム / 削除しても旧 JSON が残り続ける問題への対応。
// repo にあるが今回の出力（nextFiles）に含まれない variables ファイルのうち、
// 削除してよいものを PR の削除パスとして返す。
// - リネーム: 同じ collectionId が別パスに書かれる → 旧パスを削除
// - Figma からの削除: document にコレクションが存在しない → 全面 export のときだけ削除
// - 部分適用（includeCollectionIds あり）: 対象コレクションの古いファイルのみ削除し、他は触らない
// styles ファイルはパスが固定（styles/<type>.json）で古いファイルが残らないため対象外。
export function computeLeftoverRepoFilePaths({
  repoFiles,
  nextFiles,
  document,
  includeCollectionIds
}: {
  repoFiles: Record<string, string>;
  nextFiles: Record<string, string>;
  document: SyncDocument;
  includeCollectionIds?: Set<string>;
}): string[] {
  // parentCollectionId 欠落（#26）で出力を保留したコレクションは、repo 側の既存ファイルが
  // 唯一の正しい状態なので削除対象にしない
  const withheldCollectionIds = new Set(
    document.variables
      .filter((collection) => collection.extensions.figmaSync.missingParentCollection)
      .map((collection) => collection.extensions.figmaSync.collectionId)
  );

  const orphans: string[] = [];
  for (const [path, content] of Object.entries(repoFiles)) {
    if (!/\/variables\/[^/]+\.json$/.test(path)) {
      continue;
    }
    if (path in nextFiles) {
      continue;
    }

    let collectionId: string | undefined;
    try {
      const parsed = JSON.parse(content) as { $extensions?: { figmaSync?: { collectionId?: string } } };
      collectionId = parsed.$extensions?.figmaSync?.collectionId;
    } catch {
      // 壊れた JSON は同期対象外として触らない（parse 側が warning を出す）
      continue;
    }
    if (!collectionId) {
      continue;
    }

    if (withheldCollectionIds.has(collectionId)) {
      continue;
    }

    if (includeCollectionIds) {
      // 部分適用: 対象コレクションの旧パスだけを削除する
      if (includeCollectionIds.has(collectionId)) {
        orphans.push(path);
      }
      continue;
    }

    // 全面 export: 出力に含まれない variables ファイルは、リネームの旧パス
    // （同じ collectionId が別パスに出力済み）か、Figma から削除されたコレクションのもの
    orphans.push(path);
  }

  return orphans.sort();
}
