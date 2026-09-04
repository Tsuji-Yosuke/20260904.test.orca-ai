import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";

const options = [
  { value: "tanaka", label: "田中" },
  { value: "suzuki", label: "鈴木" },
  { value: "sato", label: "佐藤" },
];

describe("Select / Rendering", () => {
  it("displayName は Select", () => {
    expect(Select.displayName).toBe("Select");
  });

  it("combobox の Trigger とアクセシブルネームを持つ", () => {
    render(<Select items={options} aria-label="担当者" placeholder="担当者を選択" />);
    expect(
      screen.getByRole("combobox", { name: "担当者" }),
    ).toBeInTheDocument();
  });

  // AC-Select-03: Trigger は閉時に現在の選択値を 1 行で示し、値が無いときは Placeholder を示す。
  it("AC-Select-03: 未選択のとき placeholder を表示する", () => {
    render(<Select items={options} aria-label="担当者" placeholder="担当者を選択" />);
    expect(screen.getByText("担当者を選択")).toBeInTheDocument();
  });

  // AC-Select-03: 値がある場合は Placeholder ではなく選択値のラベルを 1 行で示す。
  it("AC-Select-03: controlled value のラベルを Trigger に表示する", () => {
    render(
      <Select
        items={options}
        aria-label="担当者"
        value="sato"
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("佐藤");
  });

  it("size を public DOM 属性として出す（既定 medium）", () => {
    const { rerender } = render(<Select items={options} aria-label="x" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("data-size", "medium");
    rerender(<Select items={options} aria-label="x" size="large" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("data-size", "large");
  });

  // AC-Select-12: Trigger は任意の Leading Icon を Value Display の前に表示できる。
  // 指定しても値表示は変わらず、アイコンはアクセシブルネームに寄与しない。
  it("AC-Select-12: leadingIcon は装飾として表示され、アクセシブルネームに寄与しない", () => {
    render(
      <Select
        items={options}
        aria-label="担当者"
        value="sato"
        onValueChange={() => {}}
        leadingIcon={<svg data-testid="filter-icon" />}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "担当者" });
    // アイコンは Trigger 内に描画されるが、装飾（aria-hidden なスロット）である
    const icon = screen.getByTestId("filter-icon");
    expect(trigger).toContainElement(icon);
    expect(icon.closest("[aria-hidden='true']")).not.toBeNull();
    // 値表示は変わらない
    expect(trigger).toHaveTextContent("佐藤");
  });

  it("AC-Select-12: leadingIcon 未指定のときスロット自体を描画しない", () => {
    render(<Select items={options} aria-label="担当者" />);
    expect(
      screen.getByRole("combobox").querySelector("[data-leading-icon]"),
    ).toBeNull();
  });
});

describe("Select / 単一選択", () => {
  // AC-Select-09: 確定操作（Item 選択）で Suggestion Surface が閉じる。
  it("AC-Select-09: 開いて選ぶと値が確定し Surface が閉じる", async () => {
    const onValueChange = vi.fn();
    render(
      <Select items={options} aria-label="担当者" onValueChange={onValueChange} />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "鈴木" });
    await userEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith("suzuki");
    expect(screen.getByRole("combobox")).toHaveTextContent("鈴木");
    // 単一選択は閉じる
    expect(screen.queryByRole("option")).toBeNull();
  });
});

describe("Select / disabled・readOnly・Error", () => {
  it("disabled の Trigger は disabled", () => {
    render(<Select items={options} aria-label="x" disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  // AC-Select-05: Read only は aria-readonly、Error は aria-invalid で支援技術に通知され、
  // いずれも値を破棄しない。
  it("AC-Select-05: readOnly は aria-readonly を立て、選択済みの値を破棄しない", () => {
    render(
      <Select items={options} aria-label="x" defaultValue="tanaka" readOnly />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-readonly", "true");
    expect(trigger).toHaveTextContent("田中");
  });

  // AC-Select-05: Error は aria-invalid + aria-describedby で通知され、値を破棄しない。
  it("AC-Select-05: error のとき aria-invalid と説明テキストで通知し、値を破棄しない", () => {
    render(
      <Select
        items={options}
        aria-label="担当者"
        defaultValue="sato"
        error
        errorMessage="必須項目です"
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveTextContent("佐藤");
    const describedby = trigger.getAttribute("aria-describedby");
    expect(describedby).toBeTruthy();
    expect(screen.getByText("必須項目です")).toHaveAttribute("id", describedby!);
  });
});

describe("Select / キーボード操作", () => {
  // AC-Select-10: キーボードのみで開閉・候補選択・確定・Esc によるキャンセルが完結する。
  it("AC-Select-10: キーボードのみで開いて候補を選び Enter で確定する", async () => {
    const onValueChange = vi.fn();
    render(
      <Select items={options} aria-label="担当者" onValueChange={onValueChange} />,
    );
    const trigger = screen.getByRole("combobox");
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("option", { name: "田中" })).toBeInTheDocument();
    // Base UI は開いた直後の初期フォーカス移動を非同期（setTimeout(0)）で行うため、
    // 矢印キーを送る前に最初の候補へフォーカスが移るのを待つ。
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("role", "option"),
    );
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("sato");
    expect(screen.getByRole("combobox")).toHaveTextContent("佐藤");
    expect(screen.queryByRole("option")).toBeNull();
  });

  // AC-Select-10: Esc は Suggestion Surface を閉じるが選択値は破棄しない。
  it("AC-Select-10: Esc は Surface を閉じるが選択値を破棄しない", async () => {
    render(<Select items={options} aria-label="担当者" defaultValue="tanaka" />);
    const trigger = screen.getByRole("combobox");
    await userEvent.click(trigger);
    expect(await screen.findByRole("option", { name: "鈴木" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("option")).toBeNull();
    expect(screen.getByRole("combobox")).toHaveTextContent("田中");
  });
});

describe("Select / Item", () => {
  // AC-Select-08: Item の Active（選択済み）は行全面の塗り＋前景反転で示す。
  // AC-Select-11: Item の Hover/Focused の視覚は Search の Suggestion Surface と共有し、
  // Active の塗り（data-selected）は Select 専用とする。
  it("AC-Select-08 / AC-Select-11: 選択済みの Item だけが data-selected を持つ", async () => {
    render(<Select items={options} aria-label="担当者" defaultValue="suzuki" />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "鈴木" })).toHaveAttribute(
      "data-selected",
    );
    expect(screen.getByRole("option", { name: "田中" })).not.toHaveAttribute(
      "data-selected",
    );
  });

  // AC-Select-13: Item は任意の Leading / Trailing Icon を Label の前後に表示できる。
  // 指定しても行の選択挙動とアクセシブルネームは変わらない。
  it("AC-Select-13: item の leading/trailing icon は装飾で、アクセシブルネームと選択挙動に影響しない", async () => {
    const onValueChange = vi.fn();
    render(
      <Select
        items={[
          {
            value: "tanaka",
            label: "田中",
            leadingIcon: <svg data-testid="item-lead" />,
            trailingIcon: <svg data-testid="item-trail" />,
          },
          { value: "suzuki", label: "鈴木" },
        ]}
        aria-label="担当者"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    // アクセシブルネームは Label のみ（アイコンは寄与しない）
    const option = await screen.findByRole("option", { name: "田中" });
    expect(option).toContainElement(screen.getByTestId("item-lead"));
    expect(
      screen.getByTestId("item-lead").closest("[aria-hidden='true']"),
    ).not.toBeNull();
    expect(
      screen.getByTestId("item-trail").closest("[aria-hidden='true']"),
    ).not.toBeNull();
    // 選択挙動は変わらない
    await userEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith("tanaka");
  });

  it("AC-Select-13: icon 未指定の item はスロット自体を描画しない", async () => {
    render(<Select items={options} aria-label="担当者" />);
    await userEvent.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "田中" });
    expect(option.querySelector("[data-item-icon]")).toBeNull();
  });

  it("disabled な item は選べない", async () => {
    const onValueChange = vi.fn();
    render(
      <Select
        items={[...options, { value: "yamada", label: "山田", disabled: true }]}
        aria-label="担当者"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const disabledOption = await screen.findByRole("option", { name: "山田" });
    expect(disabledOption).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(disabledOption);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
