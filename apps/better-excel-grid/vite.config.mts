/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  root: __dirname,
  base: './',
  cacheDir: '../../node_modules/.vite/apps/better-excel-grid',
  server: {
    port: 4203,
    host: 'localhost',
  },
  preview: {
    port: 4303,
    host: 'localhost',
  },
  plugins: [react()],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
