import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, 'src/server'),
      '@client': path.resolve(__dirname, 'src/client'),
    },
  },
  test: {
    globals: true,
    include: [
      'tests/unit/**/*.test.js',
      'tests/property/**/*.property.test.js',
      'tests/integration/**/*.test.js',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js', 'src/**/*.jsx'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
