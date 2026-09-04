import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "./icon-button";

const Icon = () => <span data-testid="icon">★</span>;

describe("IconButton / Rendering", () => {
  it("button role を描画する", () => {
    render(<IconButton label="閉じる" icon={<Icon />} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("displayName は IconButton", () => {
    expect(IconButton.displayName).toBe("IconButton");
  });

  it("icon を描画する", () => {
    render(<IconButton label="閉じる" icon={<Icon />} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

describe("IconButton / Accessible name", () => {
  it("AC-IconButton-02: label が accessible name になる", () => {
    render(<IconButton label="閉じる" icon={<Icon />} />);
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
  });

  it("icon は装飾扱い（aria-hidden）で accessible name に混ざらない", () => {
    render(<IconButton label="メニューを開く" icon={<span>MENU</span>} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("メニューを開く");
  });
});

describe("IconButton / Defaults", () => {
  it("type=button が既定", () => {
    render(<IconButton label="x" icon={<Icon />} />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("variant=primary / size=md / shape=rounded が既定", () => {
    render(<IconButton label="x" icon={<Icon />} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "primary");
    expect(btn).toHaveAttribute("data-size", "md");
    expect(btn).toHaveAttribute("data-shape", "rounded");
  });

  it("type の上書きが効く", () => {
    render(<IconButton label="x" icon={<Icon />} type="submit" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});

describe("IconButton / Variants, sizes, shapes", () => {
  it.each(["primary", "secondary", "ghost"] as const)(
    "AC-IconButton-03: variant=%s を public DOM 属性として出す",
    (variant) => {
      render(<IconButton label="x" icon={<Icon />} variant={variant} />);
      expect(screen.getByRole("button")).toHaveAttribute("data-variant", variant);
    },
  );

  it.each(["sm", "md", "lg"] as const)(
    "size=%s を public DOM 属性として出す",
    (size) => {
      render(<IconButton label="x" icon={<Icon />} size={size} />);
      expect(screen.getByRole("button")).toHaveAttribute("data-size", size);
    },
  );

  it.each(["rounded", "circle"] as const)(
    "AC-IconButton-04: shape=%s を public DOM 属性として出す",
    (shape) => {
      render(<IconButton label="x" icon={<Icon />} shape={shape} />);
      expect(screen.getByRole("button")).toHaveAttribute("data-shape", shape);
    },
  );
});

describe("IconButton / Interaction", () => {
  it("onClick が発火する", async () => {
    const onClick = vi.fn();
    render(<IconButton label="press" icon={<Icon />} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Enter キーで activate できる", async () => {
    const onClick = vi.fn();
    render(<IconButton label="press" icon={<Icon />} onClick={onClick} />);
    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("IconButton / State: disabled", () => {
  it("native disabled が付き、onClick を抑止する", async () => {
    const onClick = vi.fn();
    render(<IconButton label="press" icon={<Icon />} disabled onClick={onClick} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).not.toHaveAttribute("aria-disabled");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("IconButton / No toggle state", () => {
  it("AC-IconButton-05: 選択状態（aria-pressed）を持たない", () => {
    render(<IconButton label="x" icon={<Icon />} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });
});

describe("IconButton / Forwarding", () => {
  it("ref を HTMLButtonElement に forward する", () => {
    let ref: HTMLButtonElement | null = null;
    render(
      <IconButton
        label="x"
        icon={<Icon />}
        ref={(el) => {
          ref = el;
        }}
      />,
    );
    expect(ref).toBeInstanceOf(HTMLButtonElement);
  });

  it("className prop は DOM に反映される", () => {
    render(<IconButton label="x" icon={<Icon />} className="extra" />);
    expect(screen.getByRole("button")).toHaveClass("extra");
  });

  it("追加の HTML 属性を pass-through する", () => {
    render(
      <IconButton label="x" icon={<Icon />} data-testid="b" aria-describedby="hint" />,
    );
    const btn = screen.getByTestId("b");
    expect(btn).toHaveAttribute("aria-describedby", "hint");
  });

  it("AC-IconButton-01: icon は単一の wrapper に入る（icon は 1 つ）", () => {
    const { container } = render(<IconButton label="x" icon={<Icon />} />);
    const btn = container.querySelector("button")!;
    // icon wrapper ひとつだけを子に持つ
    expect(btn.children).toHaveLength(1);
    expect(within(btn).getByTestId("icon")).toBeInTheDocument();
  });
});
