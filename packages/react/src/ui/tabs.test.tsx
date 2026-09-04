import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabList, Tab, TabPanel } from "./tabs";

function Basic(props: React.ComponentProps<typeof Tabs>) {
  return (
    <Tabs {...props}>
      <TabList aria-label="ビュー">
        <Tab value="overview">概要</Tab>
        <Tab value="detail">詳細</Tab>
        <Tab value="history">履歴</Tab>
      </TabList>
      <TabPanel value="overview">概要パネル</TabPanel>
      <TabPanel value="detail">詳細パネル</TabPanel>
      <TabPanel value="history">履歴パネル</TabPanel>
    </Tabs>
  );
}

describe("Tabs / ARIA roles", () => {
  it("tablist / tab / tabpanel の role を持つ", () => {
    render(<Basic defaultValue="overview" />);
    expect(screen.getByRole("tablist", { name: "ビュー" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("選択中 Tab と Panel が aria-controls / aria-labelledby で結びつく", () => {
    render(<Basic defaultValue="overview" />);
    const tab = screen.getByRole("tab", { name: "概要" });
    const panel = screen.getByRole("tabpanel");
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
  });
});

describe("Tabs / selection", () => {
  it("AC-Tabs-01: 常に正確に 1 つの Tab が選択され、対応する Panel のみ可視", () => {
    render(<Basic defaultValue="detail" />);
    const selected = screen
      .getAllByRole("tab")
      .filter((t) => t.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAccessibleName("詳細");
    expect(screen.getByText("詳細パネル")).toBeVisible();
    expect(screen.queryByText("概要パネル")).not.toBeVisible();
  });

  it("Tab クリックで選択が切り替わる（pointer は即時活性化）", async () => {
    render(<Basic defaultValue="overview" />);
    await userEvent.click(screen.getByRole("tab", { name: "履歴" }));
    expect(screen.getByRole("tab", { name: "履歴" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("履歴パネル")).toBeVisible();
  });

  it("controlled: value を反映し onValueChange を呼ぶ", async () => {
    const onValueChange = vi.fn();
    render(<Basic value="overview" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "詳細" }));
    expect(onValueChange).toHaveBeenCalledWith("detail");
    // controlled なので内部では変わらない
    expect(screen.getByRole("tab", { name: "概要" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("Tabs / 手動活性化（manual activation）", () => {
  it("AC-Tabs-03: 矢印キーはフォーカスのみ移動し、Panel を切り替えない", async () => {
    render(<Basic defaultValue="overview" />);
    const overview = screen.getByRole("tab", { name: "概要" });
    overview.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "詳細" })).toHaveFocus();
    // 選択は変わらない
    expect(overview).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("概要パネル")).toBeVisible();
  });

  it("AC-Tabs-03: Enter / Space で確定したとき切り替わる", async () => {
    render(<Basic defaultValue="overview" />);
    screen.getByRole("tab", { name: "概要" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("tab", { name: "詳細" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("詳細パネル")).toBeVisible();
  });

  it("Home / End で端の Tab にフォーカス移動する", async () => {
    render(<Basic defaultValue="detail" />);
    screen.getByRole("tab", { name: "詳細" }).focus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "履歴" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "概要" })).toHaveFocus();
  });
});

describe("Tabs / roving tabindex", () => {
  it("選択中 Tab だけが tabIndex 0、他は -1", () => {
    render(<Basic defaultValue="detail" />);
    expect(screen.getByRole("tab", { name: "詳細" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "概要" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});

describe("Tabs / disabled", () => {
  it("無効 Tab はクリックで活性化しない", async () => {
    render(
      <Tabs defaultValue="a">
        <TabList aria-label="x">
          <Tab value="a">A</Tab>
          <Tab value="b" disabled>
            B
          </Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
        <TabPanel value="b">PB</TabPanel>
      </Tabs>,
    );
    const b = screen.getByRole("tab", { name: "B" });
    expect(b).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(b);
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("無効 Tab はキーボードでも活性化できない", async () => {
    render(
      <Tabs defaultValue="a">
        <TabList aria-label="x">
          <Tab value="a">A</Tab>
          <Tab value="b" disabled>
            B
          </Tab>
          <Tab value="c">C</Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
        <TabPanel value="b">PB</TabPanel>
        <TabPanel value="c">PC</TabPanel>
      </Tabs>,
    );
    // 無効 Tab にフォーカスを当てて Enter しても選択は変わらない
    screen.getByRole("tab", { name: "B" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("AC-Tabs-06: Tabs 全体無効のときすべての Tab が aria-disabled になる", () => {
    render(<Basic defaultValue="overview" disabled />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).toHaveAttribute("aria-disabled", "true");
    }
  });
});

describe("Tabs / variants", () => {
  it("layout と size を public DOM 属性として出す", () => {
    render(<Basic defaultValue="overview" layout="fit" size="large" />);
    const list = screen.getByRole("tablist");
    expect(list).toHaveAttribute("data-layout", "fit");
    const tab = screen.getByRole("tab", { name: "概要" });
    expect(tab).toHaveAttribute("data-size", "large");
  });

  it("layout / size の既定は spread / medium", () => {
    render(<Basic defaultValue="overview" />);
    expect(screen.getByRole("tablist")).toHaveAttribute("data-layout", "spread");
    expect(screen.getByRole("tab", { name: "概要" })).toHaveAttribute(
      "data-size",
      "medium",
    );
  });
});

describe("Tabs / icon, badge slots", () => {
  it("leading icon は装飾扱い、badge は内容として読める", () => {
    render(
      <Tabs defaultValue="a">
        <TabList aria-label="x">
          <Tab
            value="a"
            icon={<span data-testid="ic">i</span>}
            badge={<span>3</span>}
          >
            通知
          </Tab>
        </TabList>
        <TabPanel value="a">PA</TabPanel>
      </Tabs>,
    );
    const tab = screen.getByRole("tab");
    expect(within(tab).getByTestId("ic").closest("[aria-hidden='true']")).not.toBeNull();
    expect(tab).toHaveTextContent("3");
  });
});
