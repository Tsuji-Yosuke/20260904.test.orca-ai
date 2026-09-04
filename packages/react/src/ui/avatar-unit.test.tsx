import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./avatar";
import { AvatarUnit } from "./avatar-unit";

const NAMES = ["田中 太郎", "鈴木 花子", "佐藤 次郎", "高橋 三郎", "山田 五郎"];

describe("AvatarUnit / Rendering", () => {
  it("displayName は AvatarUnit", () => {
    expect(AvatarUnit.displayName).toBe("AvatarUnit");
  });

  it("AC-Avatar-09: 複数の Avatar を、各 Avatar のボーダーが境界として視認できる状態を保ったまま重ねて表示する", () => {
    render(
      <AvatarUnit>
        {NAMES.map((name) => (
          <Avatar key={name} name={name} decorative />
        ))}
      </AvatarUnit>,
    );
    // 各 Avatar 自身の常設ボーダー（AC-Avatar-06）が境界を保つ前提のため、
    // ここでは全 Avatar が個別の要素として（1 つに潰れず）描画されることを確認する。
    const avatars = document.querySelectorAll("[data-size]");
    expect(avatars).toHaveLength(NAMES.length);
  });

  it("children の DOM 順序を保つ（先頭が先行、以降は Figma のレイヤー順どおり後続が続く）", () => {
    render(
      <AvatarUnit>
        {NAMES.map((name) => (
          <Avatar key={name} name={name} decorative />
        ))}
      </AvatarUnit>,
    );
    const avatars = [...document.querySelectorAll("[data-size]")];
    for (let i = 0; i < avatars.length - 1; i++) {
      // 後続要素は先行要素より後にある（compareDocumentPosition の FOLLOWING）
      expect(
        avatars[i]!.compareDocumentPosition(avatars[i + 1]!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("className prop で追加クラスを渡せる", () => {
    const { container } = render(
      <AvatarUnit className="custom-avatar-unit">
        <Avatar name="X" decorative />
      </AvatarUnit>,
    );
    expect(container.firstElementChild).toHaveClass("custom-avatar-unit");
  });

  it("role / aria-label を呼び出し側から渡せる（グループの意味づけは呼び出し側の責務）", () => {
    render(
      <AvatarUnit role="group" aria-label="参加者 5 名">
        {NAMES.map((name) => (
          <Avatar key={name} name={name} decorative />
        ))}
      </AvatarUnit>,
    );
    expect(screen.getByRole("group", { name: "参加者 5 名" })).toBeInTheDocument();
  });
});
