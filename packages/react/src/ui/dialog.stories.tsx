import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Dialog } from "./dialog";
import { Button } from "@/registry/orca/ui/button";

const meta: Meta<typeof Dialog> = {
  title: "Components/Dialog",
  component: Dialog,
};
export default meta;

type Story = StoryObj<typeof Dialog>;

// AC-Dialog-07（検証: Storybook）: size（small/large）で Title タイポグラフィと Close Affordance 寸法が連動する。
// AC-Dialog-08（検証: Storybook）: hasButton=true で Footer が表示され、Body 下端の余白は小さいまま。
// AC-Dialog-09（検証: Storybook）: Footer レイアウトは size に連動する（small: 右寄せ横並び）。
// AC-Dialog-10（検証: Storybook）: Container は角丸なし・枠線なし・Elevation Level 5 の影を持つ。
// AC-Dialog-11（検証: Storybook）: 色・寸法・影はすべて token 経由で全テーマ破綻なし。
export const SmallWithFooter: Story = {
  render: () => (
    <Dialog>
      <Dialog.Trigger render={<Button>開く（small・Footer あり）</Button>} />
      <Dialog.Content size="small">
        <Dialog.Title>設定を保存しますか？</Dialog.Title>
        <Dialog.Body>変更内容を保存します。あとから変更できます。</Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="secondary" size="sm">キャンセル</Button>} />
          <Dialog.Close render={<Button size="sm">保存</Button>} />
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

// AC-Dialog-08（検証: Storybook）: hasButton=false のとき Footer は無く、Body 下端の余白が広がる。
export const SmallWithoutFooter: Story = {
  render: () => (
    <Dialog>
      <Dialog.Trigger render={<Button variant="secondary">開く（small・Footer なし）</Button>} />
      <Dialog.Content size="small">
        <Dialog.Title>お知らせ</Dialog.Title>
        <Dialog.Body>メンテナンスは明日 2:00〜4:00 に予定されています。</Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

// AC-Dialog-09（検証: Storybook）: large の Footer は中央寄せ縦積み（filled が上・outlined が下）。
export const LargeWithFooter: Story = {
  render: () => (
    <Dialog>
      <Dialog.Trigger render={<Button>開く（large・Footer あり）</Button>} />
      <Dialog.Content size="large">
        <Dialog.Title>この項目を削除しますか？</Dialog.Title>
        <Dialog.Body>
          削除すると元に戻せません。関連するデータもあわせて削除されます。
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close render={<Button>削除</Button>} />
          <Dialog.Close render={<Button variant="secondary">キャンセル</Button>} />
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

export const LargeWithoutFooter: Story = {
  render: () => (
    <Dialog>
      <Dialog.Trigger render={<Button variant="secondary">開く（large・Footer なし）</Button>} />
      <Dialog.Content size="large">
        <Dialog.Title>利用規約</Dialog.Title>
        <Dialog.Body>
          本サービスの利用にあたっては、以下の規約に同意いただく必要があります……
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

// severity=alert は role=alertdialog になる a11y セマンティクスのみで、視覚差は持たない（AC-Dialog-06）。
export const AlertDestructive: Story = {
  render: () => (
    <Dialog>
      <Dialog.Trigger render={<Button variant="secondary">削除</Button>} />
      <Dialog.Content severity="alert" size="small">
        <Dialog.Title>この項目を削除しますか？</Dialog.Title>
        <Dialog.Body>削除すると元に戻せません。</Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="secondary" size="sm">キャンセル</Button>} />
          <Dialog.Close render={<Button size="sm">削除</Button>} />
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="flex flex-col gap-padding-xs">
        <Button onClick={() => setOpen(true)}>外部制御で開く</Button>
        <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
          <Dialog.Content size="small">
            <Dialog.Title>制御された Dialog</Dialog.Title>
            <Dialog.Body>open を親が制御します。</Dialog.Body>
            <Dialog.Footer>
              <Dialog.Close render={<Button size="sm">閉じる</Button>} />
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </div>
    );
  },
};
