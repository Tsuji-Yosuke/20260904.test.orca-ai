import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Sidebar } from "./sidebar";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
    <path d="M3 10 12 3l9 7" />
    <path d="M5 9v11h14V9" />
  </svg>
);
const TasksIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
  </svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
const HelpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" strokeLinecap="round" />
    <path d="M12 17h.01" strokeLinecap="round" />
  </svg>
);

const meta: Meta<typeof Sidebar> = {
  title: "Components/Sidebar",
  component: Sidebar,
};
export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
  render: () => {
    const [current, setCurrent] = useState("home");
    const items = [
      { id: "home", label: "ホーム", icon: <HomeIcon /> },
      { id: "tasks", label: "タスク", icon: <TasksIcon /> },
      { id: "calendar", label: "カレンダー", icon: <CalendarIcon /> },
    ];
    return (
      <div className="h-[480px] flex">
        <Sidebar aria-label="主要ナビゲーション">
          <Sidebar.Top>
            <span className="typography-tight-body-large-bold text-on-surface">
              こんにちは、ゲストさん
            </span>
          </Sidebar.Top>
          <Sidebar.Main>
            {items.map((it) => (
              <Sidebar.Item
                key={it.id}
                icon={it.icon}
                current={current === it.id}
                onClick={() => setCurrent(it.id)}
              >
                {it.label}
              </Sidebar.Item>
            ))}
          </Sidebar.Main>
          <Sidebar.Bottom>
            <Sidebar.Item icon={<HelpIcon />} onClick={() => {}}>
              ヘルプ
            </Sidebar.Item>
          </Sidebar.Bottom>
        </Sidebar>
        <div className="flex-1 p-4 text-on-surface-dim">本文領域</div>
      </div>
    );
  },
};

// AC-Sidebar-02（検証: Storybook）: Sidebar.Item は Figma の状態語彙
// （enabled / hover / focused）が区別できる。マウスオーバーで state layer、
// Tab キーでフォーカスリングを目視確認する。
export const ItemStates: Story = {
  render: () => {
    return (
      <div className="h-[480px] flex">
        <Sidebar aria-label="状態確認用ナビゲーション">
          <Sidebar.Main>
            <Sidebar.Item icon={<HomeIcon />} onClick={() => {}}>
              通常
            </Sidebar.Item>
            <Sidebar.Item icon={<TasksIcon />} current onClick={() => {}}>
              current（見た目は通常と同一）
            </Sidebar.Item>
            <Sidebar.Item icon={<CalendarIcon />} onClick={() => {}}>
              マウスオーバー / Tab キーで hover・focus を確認
            </Sidebar.Item>
          </Sidebar.Main>
        </Sidebar>
        <div className="flex-1 p-4 text-on-surface-dim">本文領域</div>
      </div>
    );
  },
};
