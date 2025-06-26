import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
});