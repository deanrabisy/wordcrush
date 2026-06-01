import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const pagesBase = process.env.GITHUB_PAGES === 'true' && repositoryName ? `/${repositoryName}/` : '/';

export default defineConfig({
  base: pagesBase,
  plugins: [react()],
  resolve: {
    alias: {
      '@word-crush-duel/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: process.env.VITE_SERVER_URL ?? 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
