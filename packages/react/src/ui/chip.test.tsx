import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip } from "./chip";

describe("Chip / Rendering", () => {
  it("label を描画する", () => {
    render(<Chip>関東</Chip>);
    expect(screen.getByText("関東")).toBeInTheDocument();
  });

  it("displayName は Chip", () => {
    expect(Chip.displayName).toBe("Chip");
  });

  it("leadingIcon は装飾扱い（aria-hidden）で描画される", () => {
    render(
      <Chip leadingIcon={<span data-testid="lead">i</span>}>関東</Chip>,
    );
    const lead = screen.getByTestId("lead");
    expect(lead).toBeInTheDocument();
    expect(lead.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("trailingIcon は装飾扱い（aria-hidden）で描画される", () => {
    render(
      <Chip trailingIcon={<span data-testid="trail">x</span>}>関東</Chip>,
    );
    const trail = screen.getByTestId("trail");
    expect(trail).toBeInTheDocument();
    expect(trail.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("AC-Chips-01: selectable でも leading / trailing icon を両方描画できる", () => {
    render(
      <Chip
        mode="selectable"
        leadingIcon={<span data-testid="lead">i</span>}
        trailingIcon={<span data-testid="trail">x</span>}
      >
        関東
      </Chip>,
    );
    expect(screen.getByTestId("lead")).toBeInTheDocument();
    expect(screen.getByTestId("trail")).toBeInTheDocument();
  });
});

describe("Chip / Defaults", () => {
  it("mode=static / size=md が既定", () => {
    render(<Chip>x</Chip>);
    const el = screen.getByText("x").closest("[data-mode]")!;
    expect(el).toHaveAttribute("data-mode", "static");
    expect(el).toHaveAttribute("data-size", "md");
  });
});

describe("Chip / mode", () => {
  it.each(["static", "selectable", "removable"] as const)(
    "AC-Chips-02: mode=%s を public DOM 属性として区別できる",
    (mode) => {
      render(
        <Chip mode={mode} onRemove={() => {}}>
          x
        </Chip>,
      );
      expect(screen.getByText("x").closest("[data-mode]")).toHaveAttribute(
        "data-mode",
        mode,
      );
    },
  );
});

describe("Chip / size", () => {
  it.each(["sm", "md", "lg"] as const)(
    "AC-Chips-05: size=%s を public DOM 属性として出す",
    (size) => {
      render(<Chip size={size}>x</Chip>);
      expect(screen.getByText("x").closest("[data-size]")).toHaveAttribute(
        "data-size",
        size,
      );
    },
  );
});

describe("Chip / static mode", () => {
  it("操作要素ではない（button role を持たない）", () => {
    render(<Chip mode="static">x</Chip>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("AC-Chips-07: フォーカス不可（tabindex を持たない）", () => {
    render(<Chip mode="static">x</Chip>);
    const el = screen.getByText("x").closest("[data-mode]")!;
    expect(el).not.toHaveAttribute("tabindex");
  });

  it("disabled は data-disabled として表れる", () => {
    render(
      <Chip mode="static" disabled>
        x
      </Chip>,
    );
    expect(screen.getByText("x").closest("[data-mode]")).toHaveAttribute(
      "data-disabled",
    );
  });
});

describe("Chip / selectable mode", () => {
  it("toggle button（aria-pressed）として描画される", () => {
    render(
      <Chip mode="selectable">関東</Chip>,
    );
    const btn = screen.getByRole("button", { name: "関東" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("クリックで選択がトグルし aria-pressed が変わる（uncontrolled）", async () => {
    render(<Chip mode="selectable">関東</Chip>);
    const btn = screen.getByRole("button", { name: "関東" });
    await userEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("onSelectedChange に次の選択値を渡す", async () => {
    const onSelectedChange = vi.fn();
    render(
      <Chip mode="selectable" onSelectedChange={onSelectedChange}>
        関東
      </Chip>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });

  it("controlled: selected を反映し、内部状態で上書きしない", async () => {
    const onSelectedChange = vi.fn();
    render(
      <Chip mode="selectable" selected onSelectedChange={onSelectedChange}>
        関東
      </Chip>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(btn);
    expect(onSelectedChange).toHaveBeenCalledWith(false);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("disabled は native disabled で onClick を抑止する", async () => {
    const onSelectedChange = vi.fn();
    render(
      <Chip mode="selectable" disabled onSelectedChange={onSelectedChange}>
        x
      </Chip>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});

describe("Chip / removable mode", () => {
  it("AC-Chips-06: 本体と独立した削除 button を持ち、対象を含むアクセシブルネームを持つ", () => {
    render(
      <Chip mode="removable" onRemove={() => {}}>
        関東
      </Chip>,
    );
    expect(
      screen.getByRole("button", { name: "関東 を削除" }),
    ).toBeInTheDocument();
  });

  it("削除 button のクリックで onRemove が発火する", async () => {
    const onRemove = vi.fn();
    render(
      <Chip mode="removable" onRemove={onRemove}>
        関東
      </Chip>,
    );
    await userEvent.click(screen.getByRole("button", { name: "関東 を削除" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("removeLabel でアクセシブルネームを上書きできる", () => {
    render(
      <Chip mode="removable" onRemove={() => {}} removeLabel="このタグを外す">
        関東
      </Chip>,
    );
    expect(
      screen.getByRole("button", { name: "このタグを外す" }),
    ).toBeInTheDocument();
  });

  it("本体は操作要素ではない（button は削除ボタンの 1 つのみ）", () => {
    render(
      <Chip mode="removable" onRemove={() => {}}>
        関東
      </Chip>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("関東")).toBeInTheDocument();
  });
});

describe("Chip / Forwarding", () => {
  it("selectable で ref を button に forward する", () => {
    let ref: HTMLElement | null = null;
    render(
      <Chip
        mode="selectable"
        ref={(el) => {
          ref = el;
        }}
      >
        x
      </Chip>,
    );
    expect(ref).toBeInstanceOf(HTMLButtonElement);
  });

  it("className は root に反映される", () => {
    render(<Chip className="extra">x</Chip>);
    expect(screen.getByText("x").closest("[data-mode]")).toHaveClass("extra");
  });
});
