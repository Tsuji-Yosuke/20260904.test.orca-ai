import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./pagination";

describe("Pagination / Rendering", () => {
  it("displayName は Pagination", () => {
    expect(Pagination.displayName).toBe("Pagination");
  });

  it("nav ランドマークとアクセシブルネームを持つ", () => {
    render(<Pagination count={5} page={1} />);
    expect(
      screen.getByRole("navigation", { name: "ページネーション" }),
    ).toBeInTheDocument();
  });

  it("label でアクセシブルネームを上書きできる", () => {
    render(<Pagination count={5} page={1} label="記事一覧のページ" />);
    expect(
      screen.getByRole("navigation", { name: "記事一覧のページ" }),
    ).toBeInTheDocument();
  });
});

describe("Pagination / 非表示条件", () => {
  it("AC-Pagination-02: 1 ページ以下のときは何も描画しない", () => {
    const { container } = render(<Pagination count={1} page={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("AC-Pagination-08: 0 件（count=0）のときは何も描画しない", () => {
    const { container } = render(<Pagination count={0} page={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Pagination / current", () => {
  it("AC-Pagination-01: 現在ページが正確に 1 つ aria-current=page で強調される", () => {
    render(<Pagination count={5} page={3} />);
    const current = screen.getAllByRole("button").filter(
      (b) => b.getAttribute("aria-current") === "page",
    );
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName("3 ページ目");
  });

  it("AC-Pagination-05: 現在ページの押下では onPageChange を呼ばない（二重遷移しない）", async () => {
    const onPageChange = vi.fn();
    render(<Pagination count={5} page={3} onPageChange={onPageChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: "3 ページ目" }),
    );
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe("Pagination / 端のコントロール無効化", () => {
  it("AC-Pagination-03: 先頭ページでは Previous を disabled で描画する（非表示にしない）", () => {
    render(<Pagination count={5} page={1} />);
    expect(screen.getByRole("button", { name: "前のページ" })).toBeDisabled();
  });

  it("末尾ページでは Next を disabled で描画する", () => {
    render(<Pagination count={5} page={5} />);
    expect(screen.getByRole("button", { name: "次のページ" })).toBeDisabled();
  });

  it("中間ページでは Previous と Next が有効", () => {
    render(<Pagination count={5} page={3} />);
    expect(screen.getByRole("button", { name: "前のページ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "次のページ" })).toBeEnabled();
  });

  it("disabled な Previous を押しても onPageChange を呼ばない", async () => {
    const onPageChange = vi.fn();
    render(<Pagination count={5} page={1} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "前のページ" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("AC-Pagination-03: showEndpoints のとき First / Last を表示し、端では対応方向を disabled にする", () => {
    const { rerender } = render(
      <Pagination count={10} page={5} showEndpoints />,
    );
    expect(screen.getByRole("button", { name: "最初のページ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "最後のページ" })).toBeEnabled();

    rerender(<Pagination count={10} page={1} showEndpoints />);
    expect(screen.getByRole("button", { name: "最初のページ" })).toBeDisabled();
  });
});

describe("Pagination / ナビゲーション", () => {
  it("AC-Pagination-05: Page Item の押下でそのページに遷移する", async () => {
    const onPageChange = vi.fn();
    render(<Pagination count={5} page={1} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "4 ページ目" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("Previous は現在ページ -1 を渡す", async () => {
    const onPageChange = vi.fn();
    render(<Pagination count={5} page={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "前のページ" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("Next は現在ページ +1 を渡す", async () => {
    const onPageChange = vi.fn();
    render(<Pagination count={5} page={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "次のページ" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("uncontrolled では内部状態で current が動く", async () => {
    render(<Pagination count={5} defaultPage={1} />);
    await userEvent.click(screen.getByRole("button", { name: "3 ページ目" }));
    expect(
      screen.getByRole("button", { name: "3 ページ目" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("キーボード（Enter）で Page Item を活性化できる", async () => {
    const onPageChange = vi.fn();
    render(<Pagination count={5} page={1} onPageChange={onPageChange} />);
    screen.getByRole("button", { name: "2 ページ目" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("AC-Pagination-06: キーボードのみで前後 / 端 / 直接ジャンプの全操作が完結する", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination count={5} page={3} showEndpoints onPageChange={onPageChange} />,
    );
    const activateByKeyboard = async (name: string) => {
      screen.getByRole("button", { name }).focus();
      await userEvent.keyboard("{Enter}");
    };
    await activateByKeyboard("前のページ");
    await activateByKeyboard("次のページ");
    await activateByKeyboard("最初のページ");
    await activateByKeyboard("最後のページ");
    await activateByKeyboard("2 ページ目");
    expect(onPageChange.mock.calls.map((call) => call[0])).toEqual([
      2, 4, 1, 5, 2,
    ]);
  });
});

describe("Pagination / 省略表示", () => {
  it("ページ数が多いとき省略記号を出す", () => {
    render(<Pagination count={20} page={10} />);
    // 省略記号は button ではない
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
  });
});

describe("Pagination / link mode", () => {
  it("getHref を渡すと Page Item をリンクとして描画する", () => {
    render(
      <Pagination count={5} page={1} getHref={(p) => `?page=${p}`} />,
    );
    const link = screen.getByRole("link", { name: "2 ページ目" });
    expect(link).toHaveAttribute("href", "?page=2");
  });
});
