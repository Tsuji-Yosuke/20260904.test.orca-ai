import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dropdown } from "./dropdown";

function Basic({
  onEdit,
  onDup,
  ...rest
}: React.ComponentProps<typeof Dropdown> & {
  onEdit?: () => void;
  onDup?: () => void;
}) {
  return (
    <Dropdown {...rest}>
      <Dropdown.Trigger>操作</Dropdown.Trigger>
      <Dropdown.Menu>
        <Dropdown.Item onClick={onEdit}>編集</Dropdown.Item>
        <Dropdown.Item onClick={onDup}>複製</Dropdown.Item>
        <Dropdown.Item disabled>無効</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

describe("Dropdown / AC-Dropdown-01", () => {
  it("AC-Dropdown-01: 既定では閉じていて Menu Surface (role=menu) を描画しない", () => {
    render(<Basic />);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("AC-Dropdown-01: Trigger クリックで開き、role=menu の Menu Surface が現れる", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "操作" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("AC-Dropdown-01: 開いた状態で Trigger を再クリックすると Menu Surface が消える", async () => {
    render(<Basic />);
    const trigger = screen.getByRole("button", { name: "操作" });
    await userEvent.click(trigger);
    await screen.findByRole("menu");
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});

describe("Dropdown / AC-Dropdown-03", () => {
  it("AC-Dropdown-03: Menu Item を実行すると onClick が発火し、メニューが閉じてフォーカスが Trigger へ戻る", async () => {
    const onEdit = vi.fn();
    render(<Basic onEdit={onEdit} />);
    const trigger = screen.getByRole("button", { name: "操作" });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("menuitem", { name: "編集" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe("Dropdown / AC-Dropdown-04", () => {
  it("AC-Dropdown-04: Disabled な Menu Item をクリックしても実行されない", async () => {
    const onDisabled = vi.fn();
    render(
      <Dropdown>
        <Dropdown.Trigger>操作</Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item disabled onClick={onDisabled}>
            無効
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>,
    );
    await userEvent.click(screen.getByRole("button", { name: "操作" }));
    const item = await screen.findByRole("menuitem", { name: "無効" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(item);
    expect(onDisabled).not.toHaveBeenCalled();
  });
});

// 開いた直後はフォーカスが Trigger に留まる実装のため、`userEvent.keyboard` が
// 拾う `document.activeElement` 起点ではメニューへの最初のキー中継が環境依存で
// 不安定になることがある。メニュー内へフォーカスが移る最初の 1 打鍵だけは
// `fireEvent.keyDown(menu, …)` で Menu Surface 自身に直接ディスパッチし、
// 以降（実項目にフォーカスがある状態）は `userEvent.keyboard` に委ねる。
describe("Dropdown / AC-Dropdown-05", () => {
  it("AC-Dropdown-05: ArrowDown で次の項目、ArrowUp で前の項目にフォーカスが移る", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "操作" }));
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(await screen.findByRole("menuitem", { name: "編集" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "複製" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "編集" })).toHaveFocus();
  });

  it("AC-Dropdown-05: End で最後の項目、Home で最初の項目にフォーカスが移る", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "操作" }));
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "End" });
    // Home/End は disabled も含めた末尾/先頭に移動する（AC-Dropdown-04 の除外対象は
    // type-ahead / 矢印移動のみ）。disabled でも実行はできないため矛盾しない。
    expect(screen.getByRole("menuitem", { name: "無効" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "編集" })).toHaveFocus();
  });

  it("AC-Dropdown-05: 項目ラベルの頭文字を type-ahead すると一致する項目にフォーカスが移る", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "操作" }));
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "複" });
    expect(await screen.findByRole("menuitem", { name: "複製" })).toHaveFocus();
  });

  it("AC-Dropdown-05: Esc で閉じてフォーカスが Trigger に戻る", async () => {
    render(<Basic />);
    const trigger = screen.getByRole("button", { name: "操作" });
    await userEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe("Dropdown / AC-Dropdown-11", () => {
  it("AC-Dropdown-11: Trigger のアクセシブルネームは label が提供する（アイコンは装飾）", () => {
    render(
      <Dropdown>
        <Dropdown.Trigger leadingIcon={<svg data-testid="icon" />}>
          アクション
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>編集</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>,
    );
    expect(screen.getByRole("button", { name: "アクション" })).toBeInTheDocument();
  });
});

describe("Dropdown / Trigger 構成", () => {
  it("Trigger は aria-haspopup を持つ", () => {
    render(<Basic />);
    expect(screen.getByRole("button", { name: "操作" })).toHaveAttribute(
      "aria-haspopup",
    );
  });

  it("size は既定 md で、data-size に反映される", () => {
    render(<Basic />);
    expect(screen.getByRole("button", { name: "操作" })).toHaveAttribute(
      "data-size",
      "md",
    );
  });

  it("size='lg' を指定すると data-size='lg' になる", () => {
    render(
      <Dropdown>
        <Dropdown.Trigger size="lg">操作</Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>編集</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>,
    );
    expect(screen.getByRole("button", { name: "操作" })).toHaveAttribute(
      "data-size",
      "lg",
    );
  });

  // Trigger は Figma の固定構成（size/label/leadingIcon/trailingIcon）のみを公開する面であり、
  // Base UI Menu.Trigger 由来の disabled や openOnHover 系の素通し props は公開しない
  // （design-language Dropdown.md の Open Questions・ユーザー裁定 2026-07-20 #2）。
  // 型レベルの契約なので実行時アサーションは無く、`@ts-expect-error` 自体が
  // `pnpm typecheck` で検査される。
  it("Trigger は disabled / openOnHover 系の Base UI 素通し props を型として公開しない", () => {
    function TypeOnlyProbe() {
      return (
        <Dropdown>
          {/* @ts-expect-error disabled は Figma component set に無く、型として公開しない */}
          <Dropdown.Trigger disabled>操作</Dropdown.Trigger>
          <Dropdown.Menu>
            <Dropdown.Item>編集</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      );
    }
    expect(TypeOnlyProbe).toBeInstanceOf(Function);
  });
});

describe("Dropdown / AC-Dropdown-13 (IconTrigger)", () => {
  function WithIconTrigger() {
    return (
      <Dropdown>
        <Dropdown.IconTrigger
          label="カードの操作"
          icon={<svg data-testid="more-icon" />}
          variant="secondary"
          size="sm"
        />
        <Dropdown.Menu>
          <Dropdown.Item>複製</Dropdown.Item>
          <Dropdown.Item>削除</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  it("AC-Dropdown-13: IconTrigger は label をアクセシブルネームに持ち、テキストを表示しない", () => {
    render(<WithIconTrigger />);
    const trigger = screen.getByRole("button", { name: "カードの操作" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).not.toHaveTextContent(/./);
    expect(screen.getByTestId("more-icon")).toBeInTheDocument();
  });

  it("AC-Dropdown-13: IconTrigger のクリックで Menu が開閉し、aria-expanded が追従する", async () => {
    render(<WithIconTrigger />);
    const trigger = screen.getByRole("button", { name: "カードの操作" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("AC-Dropdown-13: IconTrigger は IconButton の見た目の公開属性（data-variant / data-size）を持つ", () => {
    render(<WithIconTrigger />);
    const trigger = screen.getByRole("button", { name: "カードの操作" });
    expect(trigger).toHaveAttribute("data-variant", "secondary");
    expect(trigger).toHaveAttribute("data-size", "sm");
  });
});
