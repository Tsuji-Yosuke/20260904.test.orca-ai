import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from './App';

/**
 * The complete plugin UI (single-page redesign, デザイン 24:83). Outside Figma there is
 * no main thread, so the App's `./messaging` import is redirected to an in-memory mock
 * (.storybook/figma-messaging.mock.ts) by the Vite config in .storybook/main.ts.
 * That mock answers the App's requests with sample data, so this story is fully
 * interactive: pick a preset card, open a Token Swapper's ⋯ to remap a step, drag the
 * offset sliders, or use the restart icon to reset to defaults.
 */
const meta: Meta<typeof App> = {
  title: 'Plugin/Full UI',
  component: App,
  tags: ['autodocs'],
  parameters: { figmaFrame: { width: 360, height: 600, padding: 0 } },
};
export default meta;

type Story = StoryObj<typeof App>;

export const Default: Story = {};
