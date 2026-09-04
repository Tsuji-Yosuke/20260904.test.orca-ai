import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./avatar";

describe("Avatar / Rendering", () => {
  it("displayName は Avatar", () => {
    expect(Avatar.displayName).toBe("Avatar");
  });

  it("AC-Avatar-02: role=img と name でアクセシブルネームを持つ", () => {
    render(<Avatar name="田中 太郎" />);
    expect(screen.getByRole("img", { name: "田中 太郎" })).toBeInTheDocument();
  });

  it("size を public DOM 属性として出す（既定 md）", () => {
    const { rerender } = render(<Avatar name="A" />);
    const el = screen.getByRole("img");
    expect(el).toHaveAttribute("data-size", "md");
    rerender(<Avatar name="A" size="lg" />);
    const el2 = screen.getByRole("img");
    expect(el2).toHaveAttribute("data-size", "lg");
  });
});

describe("Avatar / Fallback", () => {
  it("AC-Avatar-01: 画像が無いとき name からイニシャルを表示する", () => {
    render(<Avatar name="Tanaka Taro" />);
    expect(screen.getByText("TT")).toBeInTheDocument();
  });

  it("単一トークン名は先頭2文字をイニシャルにする", () => {
    render(<Avatar name="Tanaka" />);
    expect(screen.getByText("TA")).toBeInTheDocument();
  });

  it("カスタム fallback を表示できる", () => {
    render(<Avatar name="X" fallback={<span data-testid="fb">★</span>} />);
    expect(screen.getByTestId("fb")).toBeInTheDocument();
  });
});

describe("Avatar / Image", () => {
  // 画像の読み込み成功は Base UI が担保（jsdom では load イベントが発火しないため、
  // ここでは読み込み前に name と Fallback が保たれることだけを検証する）。
  it("AC-Avatar-01: src を渡しても読み込み前は name とイニシャル Fallback を保つ", () => {
    render(<Avatar name="田中 太郎" src="https://example.com/a.png" />);
    expect(screen.getByRole("img", { name: "田中 太郎" })).toBeInTheDocument();
    expect(screen.getByText("田太")).toBeInTheDocument();
  });

  // Base UI Avatar は画像 status が loaded になって初めて <img> を描画するが、
  // jsdom では load イベントが発火せず status が変わらないため、単体テストでは
  // 読み込み前の状態しか検証できない（実際の 1:1 比・object-cover はブラウザで実測する）。
  it("AC-Avatar-05: Image と Fallback は同一の Container 直下で枠を共有する", () => {
    const { container } = render(
      <Avatar name="田中 太郎" src="https://example.com/a.png" />,
    );
    const root = container.firstElementChild;
    // 読み込み前は Fallback のみが Container 直下の唯一の子要素であり、
    // 画像用の別枠（入れ子の div 等）を持たない。
    expect(root?.children).toHaveLength(1);
    expect(root?.textContent).toBe("田太");
  });
});

describe("Avatar / Decorative", () => {
  it("decorative のとき支援技術から隠れる（アクセシブルネームを持たない）", () => {
    render(<Avatar name="田中 太郎" decorative />);
    expect(screen.queryByRole("img", { name: "田中 太郎" })).toBeNull();
  });
});

describe("Avatar / Interaction", () => {
  it("AC-Avatar-07: 非インタラクティブであり、フォーカス可能な属性を持たない", () => {
    const { container } = render(<Avatar name="田中 太郎" />);
    const root = container.firstElementChild;
    expect(root?.tagName).toBe("SPAN");
    expect(root).not.toHaveAttribute("tabindex");
    expect(root).not.toHaveAttribute("onclick");
  });
});
