import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // theme.test.ts reads theme.css as raw text; without this Vitest stubs CSS imports to empty strings.
    css: { include: [/theme\.css/] },
  },
});
