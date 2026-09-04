import type { Decorator, Preview } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/ui/styles.css';
import './figma-theme.css';

/**
 * Wrap every story in a surface sized like the Figma plugin window (see
 * `figma.showUI({ width: 360, height: 600 })` in src/main/code.ts). Stories can
 * override width / height / padding via `parameters.figmaFrame`.
 */
const withFigmaFrame: Decorator = (Story, context) => {
  const frame = (context.parameters.figmaFrame ?? {}) as {
    width?: number;
    height?: number;
    padding?: number;
  };
  const { width = 360, height, padding = 16 } = frame;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        padding,
        overflow: 'hidden',
        background: 'var(--figma-color-bg)',
        color: 'var(--figma-color-text)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 12,
        borderRadius: 8,
        boxShadow: '0 0 0 1px var(--figma-color-border), 0 6px 24px rgba(0, 0, 0, 0.12)',
      }}
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // Surface accessibility findings in the a11y panel without failing the build.
    a11y: { test: 'todo' },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-figma-theme',
    }),
    withFigmaFrame,
  ],
};

export default preview;
