import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook para os componentes de `@navestory/ui`, usando o builder Vite (mesmo bundler já
 * usado pelo Vitest do pacote — sem builder duplicado). Reaproveita o Tailwind v4 e os
 * tokens de design já existentes via `.storybook/preview.css` (ver preview.ts).
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // Controls, actions, viewport e backgrounds já vêm no core do Storybook 10 — addon-essentials
  // (última versão publicada: 8.6.14) é anterior a essa consolidação e não é mais necessário.
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
    });
  },
};

export default config;
