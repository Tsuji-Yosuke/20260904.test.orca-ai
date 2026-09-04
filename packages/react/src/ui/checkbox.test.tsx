import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckboxGroup } from "@base-ui/react/checkbox-group";
import { Checkbox } from "./checkbox";

describe("Checkbox / Rendering", () => {
  it("displayName は Checkbox", () => {
    expect(Checkbox.displayName).toBe("Checkbox");
  });

  it("role=checkbox を持つ", () => {
    render(<Checkbox aria-label="同意する" />);
    expect(screen.getByRole("checkbox", { name: "同意する" })).toBeInTheDocument();
  });

  it("フォーム送信に参加するための native input[type=checkbox] を DOM 上に保持する", () => {
    const { container } = render(<Checkbox aria-label="同意する" name="agree" />);
    const input = container.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
  });

  it("size を data-size として公開する（既定は md）", () => {
    render(<Checkbox aria-label="a" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-size", "md");
  });

  it("size=sm / lg を data-size として公開する", () => {
    const { rerender } = render(<Checkbox aria-label="a" size="sm" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-size", "sm");
    rerender(<Checkbox aria-label="a" size="lg" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-size", "lg");
  });
});

describe("Checkbox / AC-Checkbox-13: role・checked 状態の伝達", () => {
  it("AC-Checkbox-13: 既定（unchecked）は aria-checked=false", () => {
    render(<Checkbox aria-label="同意する" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
  });

  it("AC-Checkbox-13: checked のとき aria-checked=true", () => {
    render(<Checkbox aria-label="同意する" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });

  it("AC-Checkbox-13 / AC-Checkbox-15: indeterminate のとき aria-checked=mixed", () => {
    render(<Checkbox aria-label="全選択" indeterminate />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
  });
});

describe("Checkbox / AC-Checkbox-14: ラベルとの関連付け", () => {
  it("AC-Checkbox-14: aria-labelledby で外部要素のラベルと関連付けられる", () => {
    render(
      <div>
        <span id="label-id">利用規約に同意する</span>
        <Checkbox aria-labelledby="label-id" />
      </div>,
    );
    expect(
      screen.getByRole("checkbox", { name: "利用規約に同意する" }),
    ).toBeInTheDocument();
  });

  it("AC-Checkbox-14: ラベル文言を内部に描画しない（テキストコンテンツを持たない）", () => {
    render(<Checkbox aria-label="同意する" />);
    expect(screen.getByRole("checkbox")).toHaveTextContent("");
  });
});

describe("Checkbox / AC-Checkbox-11: ヒットエリア全体でのトグル", () => {
  it("AC-Checkbox-11: Container 内であれば Box の外側をクリックしても checked がトグルする", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="同意する"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );
    // クリック先はコンテナ（role=checkbox）自体。Box は内部の装飾要素であり、
    // 当たり判定を Box だけに限定しないという AC を、コンテナ要素へのクリックで検証する。
    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });
});

describe("Checkbox / AC-Checkbox-12: キーボード操作", () => {
  it("AC-Checkbox-12: Tab でフォーカスでき、Space で checked がトグルする", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="同意する"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );
    await user.tab();
    expect(screen.getByRole("checkbox")).toHaveFocus();
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });
});

describe("Checkbox / AC-Checkbox-10: disabled", () => {
  it("AC-Checkbox-10: disabled のときポインタ操作で checked が変化しない", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="同意する"
        disabled
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("AC-Checkbox-10: disabled のときキーボード操作（Tab→Space）で checked が変化しない", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <div>
        <Checkbox
          aria-label="同意する"
          disabled
          checked={false}
          onCheckedChange={onCheckedChange}
        />
        <button type="button">next</button>
      </div>,
    );
    await user.tab();
    // disabled は tab 順から除外される（フォーカス不可）。
    expect(screen.getByRole("checkbox")).not.toHaveFocus();
    await user.keyboard(" ");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("AC-Checkbox-10 / Accessibility Notes: disabled は aria-disabled として支援技術にも伝わる", () => {
    render(<Checkbox aria-label="同意する" disabled />);
    // Root は span[role=checkbox]（native button でない）ため、Base UI の
    // useFocusableWhenDisabled が disabled 時に aria-disabled を付与する。
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Checkbox / AC-Checkbox-15: indeterminate", () => {
  it("AC-Checkbox-15: indeterminate はプログラムから明示的に設定できる", () => {
    render(<Checkbox aria-label="全選択" indeterminate />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("data-indeterminate", "");
    expect(checkbox).not.toHaveAttribute("data-checked");
  });

  it("AC-Checkbox-15: indeterminate と checked（Selected）は同時に data-checked を持たず排他", () => {
    render(<Checkbox aria-label="全選択" indeterminate checked onCheckedChange={() => {}} />);
    const checkbox = screen.getByRole("checkbox");
    // Figma 上 Selected と Indeterminate は同時に描かれない排他状態。indeterminate 優先で表示する。
    expect(checkbox).toHaveAttribute("data-indeterminate", "");
    expect(checkbox).not.toHaveAttribute("data-checked");
  });
});

describe("Checkbox / マークの切替", () => {
  it("Indicator は CheckMark（svg）と IndeterminateMark（バー）の両方を描画する", () => {
    render(<Checkbox aria-label="a" defaultChecked />);
    const checkbox = screen.getByRole("checkbox");
    // 表示の切替は data-indeterminate を参照する CSS が担うため、両マークとも常に DOM に置く。
    // jsdom には Tailwind CSS が当たらないため、ここでは存在のみ assert する（見た目は Storybook で確認）。
    expect(checkbox.querySelector("svg")).not.toBeNull();
    expect(checkbox.querySelector('span[aria-hidden="true"]')).not.toBeNull();
  });

  it("parent + CheckboxGroup の一部選択で、ローカル prop 無しでも data-indeterminate が立ちマークが切替可能になる", () => {
    render(
      // Base UI 1.0.0-rc.0 の parent 計算は controlled な value のみを参照する
      //（defaultValue は useCheckboxGroupParent に渡らない）ため controlled で組む。
      <CheckboxGroup value={["a"]} allValues={["a", "b"]} onValueChange={() => {}}>
        <Checkbox parent aria-label="全選択" />
        <Checkbox value="a" aria-label="A" />
        <Checkbox value="b" aria-label="B" />
      </CheckboxGroup>,
    );
    const parent = screen.getByRole("checkbox", { name: "全選択" });
    // indeterminate prop を渡していなくても、group 由来の実状態が data-indeterminate に反映される。
    // マークはこの属性を参照する CSS で切り替わるため、prop 分岐と違い parent 使用時も正しいマークになる。
    expect(parent).toHaveAttribute("aria-checked", "mixed");
    expect(parent).toHaveAttribute("data-indeterminate", "");
    expect(parent.querySelector("svg")).not.toBeNull();
    expect(parent.querySelector('span[aria-hidden="true"]')).not.toBeNull();
  });
});

describe("Checkbox / 型契約", () => {
  // Base UI 由来の関数形 className（state 依存）は公開 API に含めない。
  // 型レベルの契約なので実行時アサーションは無く、`@ts-expect-error` 自体が
  // `pnpm typecheck` で検査される（Dropdown.test.tsx の型契約テストと同形式）。
  it("className は文字列のみ受け付け、関数形 className を型として公開しない", () => {
    function TypeOnlyProbe() {
      return (
        <>
          <Checkbox aria-label="a" className="ok" />
          {/* @ts-expect-error 関数形 className は公開しない */}
          <Checkbox aria-label="a" className={() => "x"} />
        </>
      );
    }
    expect(TypeOnlyProbe).toBeInstanceOf(Function);
  });
});

describe("Checkbox / uncontrolled", () => {
  it("defaultChecked から開始し、クリックでトグルする（uncontrolled）", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="同意する" defaultChecked={false} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });
});
