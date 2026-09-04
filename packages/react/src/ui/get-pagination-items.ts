export type PaginationItem = number | "ellipsis";

export interface GetPaginationItemsOptions {
  /** 現在ページ（1 始まり）。 */
  page: number;
  /** 総ページ数。 */
  count: number;
  /** 現在ページの左右に表示する隣接ページ数。既定 1。 */
  siblingCount?: number;
  /** 両端に常に表示するページ数。既定 1。 */
  boundaryCount?: number;
}

function range(start: number, end: number): number[] {
  const length = end - start + 1;
  return length > 0 ? Array.from({ length }, (_, i) => start + i) : [];
}

/**
 * 現在ページに応じた Page Item の並びを返す純粋関数。
 * 数値はページ番号、"ellipsis" は省略範囲を表す。
 * 省略範囲が 1 ページ分しかない箇所では、省略記号ではなくその番号を出す。
 */
export function getPaginationItems({
  page,
  count,
  siblingCount = 1,
  boundaryCount = 1,
}: GetPaginationItemsOptions): PaginationItem[] {
  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(
    Math.max(count - boundaryCount + 1, boundaryCount + 1),
    count,
  );

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const firstEndPage = endPages[0];
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    firstEndPage !== undefined ? firstEndPage - 2 : count - 1,
  );

  return [
    ...startPages,
    ...(siblingsStart > boundaryCount + 2
      ? (["ellipsis"] as PaginationItem[])
      : boundaryCount + 1 < count - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < count - boundaryCount - 1
      ? (["ellipsis"] as PaginationItem[])
      : count - boundaryCount > boundaryCount
        ? [count - boundaryCount]
        : []),
    ...endPages,
  ];
}
