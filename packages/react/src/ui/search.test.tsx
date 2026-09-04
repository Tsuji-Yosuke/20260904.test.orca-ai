import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Search } from "./search";

const fruits = ["りんご", "みかん", "ぶどう", "もも"];

describe("Search / Rendering", () => {
  it("displayName は Search", () => {
    expect(Search.displayName).toBe("Search");
  });

  it("AC-Search-09: combobox の入力欄とアクセシブルネームを持つ", () => {
    render(<Search aria-label="果物を検索" />);
    expect(
      screen.getByRole("combobox", { name: "果物を検索" }),
    ).toBeInTheDocument();
  });

  it("AC-Search-02: 1 行の入力欄と、装飾扱いの Leading Indicator（検索アイコン）で検索だと識別できる", () => {
    const { container } = render(<Search aria-label="検索" />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("type", "search");
    const icon = container.querySelector("[data-search-icon]");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("size を public DOM 属性として出す（既定 medium）", () => {
    const { rerender, container } = render(<Search aria-label="検索" />);
    expect(container.querySelector("[data-size]")).toHaveAttribute(
      "data-size",
      "medium",
    );
    rerender(<Search aria-label="検索" size="small" />);
    expect(container.querySelector("[data-size]")).toHaveAttribute(
      "data-size",
      "small",
    );
  });
});

describe("Search / 入力と値", () => {
  it("入力のたび onValueChange を呼ぶ", async () => {
    const onValueChange = vi.fn();
    render(<Search aria-label="検索" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByRole("combobox"), "り");
    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBe("り");
  });

  it("controlled value を反映する", () => {
    render(<Search aria-label="検索" value="みかん" onValueChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("みかん");
  });
});

describe("Search / Clear", () => {
  it("値が空のときは Clear を表示しない", () => {
    render(<Search aria-label="検索" clearLabel="検索語をクリア" />);
    expect(
      screen.queryByRole("button", { name: "検索語をクリア" }),
    ).toBeNull();
  });

  it("AC-Search-03: 値があるとき Clear が現れ、クリックで空になりフォーカスは入力に残る", async () => {
    render(
      <Search aria-label="検索" defaultValue="りんご" clearLabel="検索語をクリア" />,
    );
    const clear = screen.getByRole("button", { name: "検索語をクリア" });
    expect(clear).toBeInTheDocument();
    await userEvent.click(clear);
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });
});

describe("Search / サジェスト", () => {
  it("フォーカスして入力すると候補が listbox に出て、選ぶと値が入る", async () => {
    const onValueChange = vi.fn();
    render(
      <Search aria-label="果物を検索" items={fruits} onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "り");
    const option = await screen.findByRole("option", { name: "りんご" });
    await userEvent.click(option);
    expect(input).toHaveValue("りんご");
  });
});

describe("Search / Enter submit", () => {
  it("AC-Search-05: サジェスト未ハイライトで Enter すると onSubmit を呼ぶ", async () => {
    const onSubmit = vi.fn();
    render(
      <Search aria-label="検索" defaultValue="りんご" onSubmit={onSubmit} />,
    );
    const input = screen.getByRole("combobox");
    input.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("りんご");
  });

  it("AC-Search-05: サジェストが開いていてもハイライトしていなければ Enter で onSubmit を呼び、onSelect は呼ばない", async () => {
    const onSubmit = vi.fn();
    const onSelect = vi.fn();
    render(
      <Search
        aria-label="果物を検索"
        items={fruits}
        onSubmit={onSubmit}
        onSelect={onSelect}
      />,
    );
    const input = screen.getByRole("combobox");
    input.focus();
    await userEvent.type(input, "り");
    await screen.findByRole("listbox");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("り");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("AC-Search-05: サジェストをハイライトして Enter すると onSelect が呼ばれ、onSubmit は呼ばれない", async () => {
    const onSubmit = vi.fn();
    const onSelect = vi.fn();
    render(
      <Search
        aria-label="果物を検索"
        items={fruits}
        onSubmit={onSubmit}
        onSelect={onSelect}
      />,
    );
    const input = screen.getByRole("combobox");
    input.focus();
    await userEvent.type(input, "り");
    await screen.findByRole("listbox");
    await userEvent.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant");
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("Search / Esc の優先度", () => {
  it("AC-Search-04: サジェスト展開中に Esc するとサジェストが閉じるだけで値・フォーカスは保持される", async () => {
    render(<Search aria-label="果物を検索" items={fruits} defaultValue="り" />);
    const input = screen.getByRole("combobox");
    input.focus();
    await userEvent.type(input, "り");
    await screen.findByRole("listbox");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input).toHaveValue("りり");
    expect(input).toHaveFocus();
  });

  it("AC-Search-04: サジェスト非展開・値ありで Esc すると値がクリアされフォーカスは残る", async () => {
    render(<Search aria-label="検索" defaultValue="りんご" />);
    const input = screen.getByRole("combobox");
    input.focus();
    await userEvent.keyboard("{Escape}");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });
});

describe("Search / フォーカスリング", () => {
  it("AC-Search-06: focus-visible のリングは Input 個別ではなく Container 単位で提示できる構造になっている", () => {
    const { container } = render(<Search aria-label="検索" />);
    const input = screen.getByRole("combobox");
    const searchContainer = container.querySelector("[data-size]");
    expect(searchContainer).not.toBeNull();
    // Input・Leading Indicator・Clear は同じ Container の子孫であり、
    // フォーカスは常に Container の内側で完結する（Container 単位の :focus-within リングが成立する構造）
    expect(searchContainer).toContainElement(input);
    input.focus();
    expect(input).toHaveFocus();
    expect(searchContainer?.contains(document.activeElement)).toBe(true);
  });
});

describe("Search / Error", () => {
  it("AC-Search-08: error のとき aria-invalid と説明テキストで通知する", () => {
    render(
      <Search
        aria-label="検索"
        error
        errorMessage="入力が不正です"
      />,
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedby = input.getAttribute("aria-describedby");
    expect(describedby).toBeTruthy();
    expect(screen.getByText("入力が不正です")).toHaveAttribute(
      "id",
      describedby!,
    );
  });
});

describe("Search / Loading", () => {
  it("loading のとき aria-busy を立てる", () => {
    const { container } = render(<Search aria-label="検索" loading />);
    expect(container.querySelector("[data-search-icon]")).toBeInTheDocument();
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
  });
});

describe("Search / Disabled", () => {
  it("disabled のとき入力できない", () => {
    render(<Search aria-label="検索" disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
