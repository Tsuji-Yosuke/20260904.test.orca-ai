import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./dialog";

function Basic(props: React.ComponentProps<typeof Dialog>) {
  return (
    <Dialog {...props}>
      <Dialog.Trigger>開く</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>確認</Dialog.Title>
        <Dialog.Body>本当に実行しますか？</Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close>キャンセル</Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

describe("Dialog / Rendering", () => {
  it("displayName は Dialog", () => {
    expect(Dialog.displayName).toBe("Dialog");
  });

  it("AC-Dialog-01: 既定では閉じていて dialog と backdrop を描画しない", () => {
    render(<Basic />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector('[data-dialog-slot="backdrop"]')).toBeNull();
  });
});

describe("Dialog / open・close", () => {
  it("AC-Dialog-01: Trigger で開くと dialog と backdrop が両方存在する", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.querySelector('[data-dialog-slot="backdrop"]')).not.toBeNull();
  });

  it("AC-Dialog-02: 開いた後にフォーカスが Dialog 内へ移動し、閉じると Trigger に戻る", async () => {
    render(<Basic />);
    const trigger = screen.getByRole("button", { name: "開く" });
    await userEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("AC-Dialog-03: Esc で閉じる", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AC-Dialog-03: 背景クリックで閉じる", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    const backdrop = document.querySelector('[data-dialog-slot="backdrop"]');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop as Element);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AC-Dialog-04: Title が Dialog のアクセシブルネームになる", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("dialog", { name: "確認" })).toBeInTheDocument();
  });

  it("AC-Dialog-05: Close Affordance が既定のアクセシブルネームを持ち、クリックで閉じる", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    const closeButton = screen.getByRole("button", { name: "閉じる" });
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AC-Dialog-05: severity=alert・hasButton なしでも Close Affordance は常設される", async () => {
    render(
      <Dialog>
        <Dialog.Trigger>削除</Dialog.Trigger>
        <Dialog.Content severity="alert">
          <Dialog.Title>この項目を削除しますか？</Dialog.Title>
          <Dialog.Body>元に戻せません。</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
  });

  it("Close Affordance のアクセシブルネームは closeLabel で上書きできる", async () => {
    render(
      <Dialog>
        <Dialog.Trigger>開く</Dialog.Trigger>
        <Dialog.Content closeLabel="Close">
          <Dialog.Title>T</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});

describe("Dialog / controlled", () => {
  it("open を反映し、閉じる操作で onOpenChange(false) を呼ぶ", async () => {
    const onOpenChange = vi.fn();
    render(<Basic open onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});

describe("Dialog / severity", () => {
  it("AC-Dialog-06: severity=alert のとき alertdialog になる", async () => {
    render(
      <Dialog>
        <Dialog.Trigger>削除</Dialog.Trigger>
        <Dialog.Content severity="alert">
          <Dialog.Title>削除しますか？</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(
      screen.getByRole("alertdialog", { name: "削除しますか？" }),
    ).toBeInTheDocument();
  });

  it("AC-Dialog-06: 既定は role=dialog になる", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("Dialog / size", () => {
  it("size を Popup の public DOM 属性として出す（既定 small）", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("data-size", "small");
  });

  it("size=large を Popup の public DOM 属性として出す", async () => {
    render(
      <Dialog>
        <Dialog.Trigger>開く</Dialog.Trigger>
        <Dialog.Content size="large">
          <Dialog.Title>T</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("data-size", "large");
  });
});
