import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table } from "./table";
import { Checkbox } from "@/registry/orca/ui/checkbox";

function Basic(props: React.ComponentProps<typeof Table>) {
  return (
    <Table {...props}>
      <caption>社員一覧</caption>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>名前</Table.HeaderCell>
          <Table.HeaderCell>年齢</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell scope="row">田中</Table.HeaderCell>
          <Table.Cell>30</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">鈴木</Table.HeaderCell>
          <Table.Cell>25</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

describe("Table / Rendering", () => {
  it("displayName は Table", () => {
    expect(Table.displayName).toBe("Table");
  });

  it("AC-Table-01: table セマンティクス（table/caption/thead/tbody/tr/th/td）で構造を表現する", () => {
    render(<Basic />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("rowheader")).toHaveLength(2);
    expect(screen.getAllByRole("cell")).toHaveLength(2);
    // caption は素の HTML 要素として表内に直接マークアップできる（専用スタイル API を持たない）。
    expect(screen.getByText("社員一覧").tagName).toBe("CAPTION");
  });

  it("AC-Table-02: caption を指定すると table のアクセシブルネームになる", () => {
    render(<Basic />);
    expect(screen.getByRole("table", { name: "社員一覧" })).toBeInTheDocument();
  });

  it("AC-Table-02: caption が無い場合は aria-label でアクセシブルネームを与えられる", () => {
    render(
      <Table aria-label="価格表">
        <Table.Body>
          <Table.Row>
            <Table.Cell>x</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(screen.getByRole("table", { name: "価格表" })).toBeInTheDocument();
  });
});

describe("Table / AC-Table-03: HeaderCell scope", () => {
  it("AC-Table-03: 既定は列見出し（scope=col）、scope=row で行見出しになり、データセルと対応づく", () => {
    render(<Basic />);
    const colHeaders = screen.getAllByRole("columnheader");
    expect(colHeaders[0]).toHaveAttribute("scope", "col");
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders[0]).toHaveAttribute("scope", "row");
  });
});

describe("Table / AC-Table-12: 横スクロール領域", () => {
  it("AC-Table-12: table を独立したスクロール領域（横スクロール可能な wrapper）で包む", () => {
    render(<Basic />);
    const table = screen.getByRole("table");
    const wrapper = table.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute("data-table-scroll");
  });

  it("AC-Table-12: スクロール領域はキーボードで到達できる（tabIndex=0 の region）", () => {
    render(<Basic />);
    const wrapper = screen.getByRole("table").parentElement;
    // 横スクロールが発生したときキーボード利用者が矢印キーでスクロールできるよう、
    // wrapper を tabIndex=0 + role=region にする（GOV.UK 等の確立パターン）。
    expect(wrapper).toHaveAttribute("tabindex", "0");
    expect(wrapper).toHaveAttribute("role", "region");
  });
});

describe("Table / size", () => {
  it("size を data-size として公開する（既定 md）", () => {
    const { rerender } = render(<Basic />);
    expect(screen.getByRole("table")).toHaveAttribute("data-size", "md");
    rerender(<Basic size="sm" />);
    expect(screen.getByRole("table")).toHaveAttribute("data-size", "sm");
    rerender(<Basic size="lg" />);
    expect(screen.getByRole("table")).toHaveAttribute("data-size", "lg");
  });
});

describe("Table / cell type", () => {
  it("HeaderCell / Cell の type（text 既定 / slot / checkbox）を data-type として公開する", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell type="checkbox">
              <Checkbox aria-label="全選択" />
            </Table.HeaderCell>
            <Table.HeaderCell type="slot">
              <span>custom</span>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell type="checkbox">
              <Checkbox aria-label="選択" />
            </Table.Cell>
            <Table.Cell type="slot">
              <span>custom</span>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const headers = screen.getAllByRole("columnheader");
    expect(headers[0]).toHaveAttribute("data-type", "checkbox");
    expect(headers[1]).toHaveAttribute("data-type", "slot");
    const cells = screen.getAllByRole("cell");
    expect(cells[0]).toHaveAttribute("data-type", "checkbox");
    expect(cells[1]).toHaveAttribute("data-type", "slot");
  });

  it("text 型が既定で、children とともに trailingIcon を末尾スロットとして描画する", () => {
    render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell trailingIcon={<span data-testid="icon">i</span>}>
              値
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const cell = screen.getByRole("cell");
    expect(cell).toHaveAttribute("data-type", "text");
    expect(cell).toHaveTextContent("値");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("trailingIcon 無しの text セルは children をラップ要素で包まず素で描画する", () => {
    render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>値</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const cell = screen.getByRole("cell");
    expect(cell).toHaveTextContent("値");
    // 素の children 経路なら td への text-align 等の className がそのまま効く
    //（flex ラップが挟まると効かない）。ラップ有無は DOM 構造でしか観測できないため最小限の assert。
    expect(cell.querySelector("span")).toBeNull();
  });

  it("AC-Table-11: CheckBox Type セルは Checkbox コンポーネントを内包し、その状態をそのまま表現する", () => {
    render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell type="checkbox">
              <Checkbox aria-label="選択" checked onCheckedChange={() => {}} />
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const checkbox = screen.getByRole("checkbox", { name: "選択" });
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });
});

describe("Table / AC-Table-10: disabled", () => {
  it("AC-Table-10: Cell は disabled を opt-in で指定でき、data-disabled として公開する", () => {
    render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>enabled</Table.Cell>
            <Table.Cell disabled>disabled</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const cells = screen.getAllByRole("cell");
    expect(cells[0]).not.toHaveAttribute("data-disabled");
    expect(cells[1]).toHaveAttribute("data-disabled", "");
  });
});

describe("Table / Forwarding", () => {
  // public API（className 透過）の契約検証。TableProps は HTMLAttributes<HTMLTableElement> なので
  // className は wrapper ではなく <table> 自身に渡る。passthrough 検証はこの1件のみ許容
  //（className ベースのテストは原則書かない。packages/react/CLAUDE.md 参照）。
  it("className を <table> 要素に反映する", () => {
    render(
      <Table aria-label="t" className="extra">
        <Table.Body>
          <Table.Row>
            <Table.Cell>x</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(screen.getByRole("table")).toHaveClass("extra");
  });
});
