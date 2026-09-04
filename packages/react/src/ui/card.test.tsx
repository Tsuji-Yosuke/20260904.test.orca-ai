import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Card } from "./card";

describe("Card / Rendering", () => {
  it("displayName は Card", () => {
    expect(Card.displayName).toBe("Card");
  });

  it("AC-Card-05: role・クリックハンドラ・フォーカス可能属性を持たない静的な div", () => {
    const { container } = render(
      <Card data-testid="c">
        <Card.Body>ただの容れ物</Card.Body>
      </Card>,
    );
    const root = container.firstElementChild;
    expect(root?.tagName).toBe("DIV");
    expect(root).not.toHaveAttribute("role");
    expect(root).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("AC-Card-07: emphasis / size / インタラクティブ化の variant を持たない", () => {
    const { container } = render(
      <Card data-testid="c">
        <Card.Body>本文</Card.Body>
      </Card>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("data-emphasis");
    expect(root).not.toHaveAttribute("data-size");
    expect(root).not.toHaveAttribute("href");
    expect(root.tagName).not.toBe("A");
    expect(root.tagName).not.toBe("BUTTON");
  });
});

describe("Card / 構成", () => {
  it("AC-Card-01: Media / Header（Title・Description・action）/ Body / Footer を任意の組み合わせで構成できる", () => {
    render(
      <Card data-testid="c">
        <Card.Media>
          <img alt="" src="x.png" />
        </Card.Media>
        <Card.Header action={<button aria-label="メニュー">操作</button>}>
          <Card.Title>タイトル</Card.Title>
          <Card.Description>説明</Card.Description>
        </Card.Header>
        <Card.Body>本文</Card.Body>
        <Card.Footer>
          <button>フッター操作</button>
        </Card.Footer>
      </Card>,
    );
    const c = screen.getByTestId("c");
    expect(within(c).getByText("タイトル")).toBeInTheDocument();
    expect(within(c).getByText("説明")).toBeInTheDocument();
    expect(within(c).getByText("本文")).toBeInTheDocument();
    expect(within(c).getByRole("button", { name: "メニュー" })).toBeInTheDocument();
    expect(within(c).getByRole("button", { name: "フッター操作" })).toBeInTheDocument();
  });

  it("AC-Card-01: すべてのスロットを省略しても静的なコンテナとして描画される", () => {
    render(<Card data-testid="empty" />);
    expect(screen.getByTestId("empty")).toBeInTheDocument();
    expect(screen.getByTestId("empty")).toBeEmptyDOMElement();
  });

  it("AC-Card-01: Header だけ、Body だけ等の部分的な組み合わせも成立する", () => {
    render(
      <Card data-testid="c">
        <Card.Header>
          <Card.Title>見出しのみ</Card.Title>
        </Card.Header>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "見出しのみ" })).toBeInTheDocument();
  });

  it("AC-Card-04: Card.Title は見出し要素として意味づけられる", () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>記事のタイトル</Card.Title>
        </Card.Header>
      </Card>,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "記事のタイトル" }),
    ).toBeInTheDocument();
  });
});

describe("Card / Header action スロット", () => {
  it("Header の action は Title/Description と同じ Header 内に配置される", () => {
    render(
      <Card>
        <Card.Header action={<button aria-label="コンテキストメニュー">⋮</button>}>
          <Card.Title>タイトル</Card.Title>
        </Card.Header>
      </Card>,
    );
    const action = screen.getByRole("button", { name: "コンテキストメニュー" });
    const heading = screen.getByRole("heading", { name: "タイトル" });
    // 同じ Header 領域を共有する
    expect(action.closest('[data-card-slot="header"]')).toBe(
      heading.closest('[data-card-slot="header"]'),
    );
  });

  it("action を渡さなければ Header Slot は描画されない", () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>タイトル</Card.Title>
        </Card.Header>
      </Card>,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("Card / Forwarding", () => {
  it("className を root に反映し、追加属性を pass-through する", () => {
    render(
      <Card data-testid="c" className="extra" aria-describedby="hint">
        <Card.Body>x</Card.Body>
      </Card>,
    );
    const c = screen.getByTestId("c");
    expect(c).toHaveClass("extra");
    expect(c).toHaveAttribute("aria-describedby", "hint");
  });
});
