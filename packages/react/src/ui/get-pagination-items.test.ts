import { describe, expect, it } from "vitest";
import { getPaginationItems } from "./get-pagination-items";

describe("getPaginationItems", () => {
  it("省略不要な少数ページは全ページを返す", () => {
    expect(getPaginationItems({ page: 1, count: 5 })).toEqual([1, 2, 3, 4, 5]);
  });

  it("先頭にいるときは末尾側だけを省略する", () => {
    expect(getPaginationItems({ page: 1, count: 10 })).toEqual([
      1,
      2,
      3,
      4,
      5,
      "ellipsis",
      10,
    ]);
  });

  it("中間では両側を省略する", () => {
    expect(getPaginationItems({ page: 6, count: 12 })).toEqual([
      1,
      "ellipsis",
      5,
      6,
      7,
      "ellipsis",
      12,
    ]);
  });

  it("末尾にいるときは先頭側だけを省略する", () => {
    expect(getPaginationItems({ page: 10, count: 10 })).toEqual([
      1,
      "ellipsis",
      6,
      7,
      8,
      9,
      10,
    ]);
  });

  it("siblingCount を増やすと現在ページ近傍の表示が広がる", () => {
    expect(getPaginationItems({ page: 6, count: 12, siblingCount: 2 })).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      7,
      8,
      "ellipsis",
      12,
    ]);
  });

  it("隙間が1ページ分しかない側は省略記号でなくその番号を出す", () => {
    // 先頭側の隙間が「2」だけなので ellipsis ではなく 2 を出す
    expect(getPaginationItems({ page: 4, count: 10 })).toEqual([
      1,
      2,
      3,
      4,
      5,
      "ellipsis",
      10,
    ]);
  });
});
