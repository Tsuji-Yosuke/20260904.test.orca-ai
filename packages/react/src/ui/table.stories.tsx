import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Table, type TableSize } from "./table";
import { Checkbox } from "@/registry/orca/ui/checkbox";

const rows = [
  { id: "1", name: "田中 太郎", dept: "営業", age: 34 },
  { id: "2", name: "鈴木 花子", dept: "開発", age: 29 },
  { id: "3", name: "佐藤 次郎", dept: "デザイン", age: 41 },
  { id: "4", name: "高橋 三郎", dept: "人事", age: 38 },
];

const meta: Meta<typeof Table> = {
  title: "Components/Table",
  component: Table,
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
};
export default meta;

type Story = StoryObj<typeof Table>;

export const Basic: Story = {
  render: (args) => (
    <div className="w-[480px]">
      <Table {...args}>
        <caption className="sr-only">社員一覧</caption>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>名前</Table.HeaderCell>
            <Table.HeaderCell>部署</Table.HeaderCell>
            <Table.HeaderCell>年齢</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((r) => (
            <Table.Row key={r.id}>
              <Table.HeaderCell scope="row">{r.name}</Table.HeaderCell>
              <Table.Cell>{r.dept}</Table.Cell>
              <Table.Cell>{r.age}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  ),
};

// AC-Table-04（検証: Storybook）: size は Small / Medium / Large の3段階を持ち、
//   Header Cell / Body Cell とも行高 40 / 48 / 56px に対応する。
const sizes: TableSize[] = ["sm", "md", "lg"];
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-padding-xl w-[480px]">
      {sizes.map((size) => (
        <div key={size}>
          <p className="typography-tight-body-small text-on-surface-dim">size = {size}</p>
          <Table size={size}>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>名前</Table.HeaderCell>
                <Table.HeaderCell>年齢</Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {rows.slice(0, 2).map((r) => (
                <Table.Row key={r.id}>
                  <Table.HeaderCell scope="row">{r.name}</Table.HeaderCell>
                  <Table.Cell>{r.age}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      ))}
    </div>
  ),
};

// AC-Table-05（検証: Storybook）: cell type は Text / Slot / CheckBox の3種を
//   Header Cell / Body Cell 共通で持つ。
export const CellTypes: Story = {
  render: () => (
    <div className="w-[480px]">
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell type="checkbox">
              <Checkbox aria-label="全選択" />
            </Table.HeaderCell>
            <Table.HeaderCell>名前（Text）</Table.HeaderCell>
            <Table.HeaderCell type="slot">
              <span className="typography-standard-label-small">Slot</span>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.slice(0, 2).map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell type="checkbox">
                <Checkbox aria-label={`${r.name} を選択`} />
              </Table.Cell>
              <Table.Cell>{r.name}</Table.Cell>
              <Table.Cell type="slot">
                <button
                  type="button"
                  className="typography-standard-label-small text-primary"
                >
                  詳細
                </button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  ),
};

// AC-Table-06（検証: Storybook）: Header Cell の背景は Body Cell と異なる面色（surface-container 相当）
//   で区別され、罫線を持たない。
// AC-Table-07（検証: Storybook）: Body Cell は自身の下端に 1px の境界線を持つ。
export const HeaderVsBody: Story = {
  render: () => (
    <div className="w-[320px]">
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header（surface-container・罫線無し）</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Body（surface・下端 1px 罫線）</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Body（surface・下端 1px 罫線）</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  ),
};

// AC-Table-08（検証: Storybook）: Header Cell / Body Cell とも Hover で state layer 相当の
//   視覚変化が加わる。マウスを乗せて確認する（pseudo-class を script で強制しない）。
export const HoverState: Story = {
  render: () => (
    <div className="w-[320px]">
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>hover して確認</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>hover して確認</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  ),
};

// AC-Table-09（検証: Storybook）: Body Cell は :focus-within 相当でセルを囲む共有 focus リングを
//   表示する。Tab キーでセル内のリンクにフォーカスして確認する。
export const FocusedState: Story = {
  render: () => (
    <div className="w-[320px]">
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>
              <a href="#" className="typography-standard-text-link-small">
                Tab でフォーカス
              </a>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  ),
};

// AC-Table-10（検証: Storybook）: Body Cell は disabled を opt-in で指定でき、文字色が disabled
//   系の弱色に変わる。
export const DisabledState: Story = {
  render: () => (
    <div className="w-[320px]">
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>enabled</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell disabled>disabled</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  ),
};

// AC-Table-11（検証: Storybook）: CheckBox Type セルは Checkbox コンポーネントを内包し、
//   Checkbox 原典の状態（checked/indeterminate/disabled）をそのまま表現する。
function CheckboxColumnDemo() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allSelected = selectedCount === rows.length;
  const indeterminate = selectedCount > 0 && !allSelected;

  return (
    <div className="w-[480px]">
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell type="checkbox">
              <Checkbox
                aria-label="全選択"
                checked={allSelected}
                indeterminate={indeterminate}
                onCheckedChange={(checked) =>
                  setSelected(
                    Object.fromEntries(rows.map((r) => [r.id, checked === true])),
                  )
                }
              />
            </Table.HeaderCell>
            <Table.HeaderCell>名前</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell type="checkbox">
                <Checkbox
                  aria-label={`${r.name} を選択`}
                  checked={selected[r.id] ?? false}
                  onCheckedChange={(checked) =>
                    setSelected((prev) => ({ ...prev, [r.id]: checked === true }))
                  }
                />
              </Table.Cell>
              <Table.Cell>{r.name}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}

export const CheckboxColumn: Story = {
  render: () => <CheckboxColumnDemo />,
};

// AC-Table-14（検証: Storybook）: 色・寸法・境界は token 経由で、全テーマで破綻しない。
// data-theme（light/dark）を切り替えて確認する。
export const AllStatesGrid: Story = {
  render: () => (
    <div className="flex flex-col gap-padding-xl w-[480px]">
      {sizes.map((size) => (
        <Table key={size} size={size}>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell type="checkbox">
                <Checkbox aria-label={`${size} 全選択`} />
              </Table.HeaderCell>
              {/* trailingIcon スロット側が aria-hidden とサイズを担保するため、素の文字列でよい。 */}
              <Table.HeaderCell trailingIcon="↕">名前</Table.HeaderCell>
              <Table.HeaderCell>年齢</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.slice(0, 2).map((r, i) => (
              <Table.Row key={r.id}>
                <Table.Cell type="checkbox">
                  <Checkbox aria-label={`${r.name} を選択`} defaultChecked={i === 0} />
                </Table.Cell>
                <Table.Cell disabled={i === 1}>{r.name}</Table.Cell>
                <Table.Cell disabled={i === 1}>{r.age}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ))}
    </div>
  ),
};
