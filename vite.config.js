import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, 'src/server'),
      '@client': path.resolve(__dirname, 'src/client'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
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
    },
  },
});
