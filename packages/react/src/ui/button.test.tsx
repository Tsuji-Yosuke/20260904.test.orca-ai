import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button / Rendering", () => {
  it("children を持つ button role を描画する", () => {
    render(<Button>OK</Button>);
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("displayName は Button", () => {
    expect(Button.displayName).toBe("Button");
  });
});

describe("Button / Defaults", () => {
  it("type=button が既定", () => {
    render(<Button>x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("variant=primary と size=md が既定", () => {
    render(<Button>x</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button).toHaveAttribute("data-size", "md");
  });

  it("type の上書きが効く（form submit など）", () => {
    render(<Button type="submit">x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});

describe("Button / Variants and sizes", () => {
  it.each(["primary", "secondary", "ghost"] as const)(
    "AC-Button-02: variant=%s を public DOM 属性として出す",
    (variant) => {
      render(<Button variant={variant}>x</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("data-variant", variant);
    },
  );

  it.each(["sm", "md", "lg"] as const)(
    "size=%s を public DOM 属性として出す",
    (size) => {
      render(<Button size={size}>x</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("data-size", size);
    },
  );
});

describe("Button / Icon slots", () => {
  it("AC-Button-01: leadingIcon は label より前に配置される", () => {
    render(
      <Button leadingIcon={<span data-testid="lead">L</span>}>Label</Button>,
    );
    const btn = screen.getByRole("button");
    const lead = within(btn).getByTestId("lead");
    const label = within(btn).getByText("Label");
    expect(
      lead.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("AC-Button-01: trailingIcon は label より後に配置される", () => {
    render(
      <Button trailingIcon={<span data-testid="trail">T</span>}>Label</Button>,
    );
    const btn = screen.getByRole("button");
    const trail = within(btn).getByTestId("trail");
    const label = within(btn).getByText("Label");
    expect(
      label.compareDocumentPosition(trail) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("AC-Button-05: icon は装飾扱い（aria-hidden）で accessible name に混ざらない", () => {
    render(
      <Button leadingIcon={<span data-testid="lead">PLUS</span>}>保存</Button>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("保存");
  });

  it.each([null, false, undefined])(
    "leadingIcon=%s のときは icon スロット自体を描画しない",
    (value) => {
      const { container } = render(
        <Button leadingIcon={value as never}>x</Button>,
      );
      const btn = container.querySelector("button")!;
      expect(btn.children).toHaveLength(1);
      expect(btn.children[0]?.textContent).toBe("x");
    },
  );
});

describe("Button / Interaction", () => {
  it("onClick が発火する", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>press</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Enter キーで activate できる", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>press</Button>);
    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Button / State: disabled", () => {
  it("AC-Button-04: native disabled が付き、onClick を抑止する", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        press
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).not.toHaveAttribute("aria-disabled");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("enabled 時は aria-disabled を出さない", () => {
    render(<Button>x</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-disabled");
  });
});

describe("Button / Forwarding", () => {
  it("ref を HTMLButtonElement に forward する", () => {
    let ref: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(el) => {
          ref = el;
        }}
      >
        x
      </Button>,
    );
    expect(ref).toBeInstanceOf(HTMLButtonElement);
  });

  it("className prop は DOM に反映される", () => {
    render(<Button className="extra">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("extra");
  });

  it("追加の HTML 属性を pass-through する", () => {
    render(
      <Button data-testid="b" aria-describedby="hint">
        x
      </Button>,
    );
    const btn = screen.getByTestId("b");
    expect(btn).toHaveAttribute("aria-describedby", "hint");
  });
});
