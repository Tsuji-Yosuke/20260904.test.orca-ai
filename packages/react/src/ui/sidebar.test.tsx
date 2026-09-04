import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./sidebar";

describe("Sidebar / landmark", () => {
  it("displayName は Sidebar", () => {
    expect(Sidebar.displayName).toBe("Sidebar");
  });

  it("AC-Sidebar-01: navigation ランドマークとアクセシブルネームを持つ", () => {
    render(
      <Sidebar aria-label="主要ナビゲーション">
        <Sidebar.Main>
          <Sidebar.Item href="/">ホーム</Sidebar.Item>
        </Sidebar.Main>
      </Sidebar>,
    );
    expect(
      screen.getByRole("navigation", { name: "主要ナビゲーション" }),
    ).toBeInTheDocument();
  });
});

describe("Sidebar / slots", () => {
  it("AC-Sidebar-05: Top / Main / Bottom スロットに任意要素を配置できる", () => {
    render(
      <Sidebar aria-label="nav">
        <Sidebar.Top>
          <div>ブランド</div>
        </Sidebar.Top>
        <Sidebar.Main>
          <Sidebar.Item href="/a">A</Sidebar.Item>
        </Sidebar.Main>
        <Sidebar.Bottom>
          <div>設定</div>
        </Sidebar.Bottom>
      </Sidebar>,
    );
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("ブランド")).toBeInTheDocument();
    expect(within(nav).getByText("設定")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "A" })).toBeInTheDocument();
  });
});

describe("Sidebar.Item", () => {
  it("href を渡すとリンク、渡さないとボタンになる", () => {
    render(
      <Sidebar aria-label="nav">
        <Sidebar.Main>
          <Sidebar.Item href="/home">ホーム</Sidebar.Item>
          <Sidebar.Item onClick={() => {}}>アクション</Sidebar.Item>
        </Sidebar.Main>
      </Sidebar>,
    );
    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute(
      "href",
      "/home",
    );
    expect(
      screen.getByRole("button", { name: "アクション" }),
    ).toBeInTheDocument();
  });

  it("AC-Sidebar-03: current は aria-current=page で示される（視覚は変わらない、同時に1つ）", () => {
    render(
      <Sidebar aria-label="nav">
        <Sidebar.Main>
          <Sidebar.Item href="/a" current>
            A
          </Sidebar.Item>
          <Sidebar.Item href="/b">B</Sidebar.Item>
        </Sidebar.Main>
      </Sidebar>,
    );
    const items = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAccessibleName("A");
    // current の視覚信号は無い（Figma の Current variant 待ち）ため、data-current は
    // current な Item にのみ付与され、他の Item には付与されないことだけを確認する。
    const currentItem = screen.getByRole("link", { name: "A" });
    const otherItem = screen.getByRole("link", { name: "B" });
    expect(currentItem).toHaveAttribute("data-current", "true");
    expect(otherItem).not.toHaveAttribute("data-current");
    expect(otherItem).not.toHaveAttribute("aria-current");
  });

  it("icon は装飾扱いで読める", () => {
    render(
      <Sidebar aria-label="nav">
        <Sidebar.Main>
          <Sidebar.Item href="/a" icon={<span data-testid="ic">i</span>}>
            通知
          </Sidebar.Item>
        </Sidebar.Main>
      </Sidebar>,
    );
    const item = screen.getByRole("link", { name: /通知/ });
    expect(within(item).getByTestId("ic").closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("AC-Sidebar-04: キーボードのみで Top / Main / Bottom を順に巡回し、Item を選択できる", async () => {
    const onSelect = vi.fn();
    render(
      <Sidebar aria-label="nav">
        <Sidebar.Top>
          <button type="button">トップ</button>
        </Sidebar.Top>
        <Sidebar.Main>
          <Sidebar.Item onClick={onSelect}>選択</Sidebar.Item>
        </Sidebar.Main>
        <Sidebar.Bottom>
          <button type="button">ボトム</button>
        </Sidebar.Bottom>
      </Sidebar>,
    );
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "トップ" })).toHaveFocus();
    await userEvent.tab();
    const item = screen.getByRole("button", { name: "選択" });
    expect(item).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "ボトム" })).toHaveFocus();
  });
});
