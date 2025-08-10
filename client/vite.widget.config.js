import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/components/ChatWidget/EmbeddableWidget.jsx'),
      name: 'ChatWidget',
      fileName: 'chat-widget',
      formats: ['iife'] // Immediately Invoked Function Expression for browser
    },
    rollupOptions: {
      external: [], // Don't externalize any dependencies for the widget
      output: {
        globals: {}
      }
    },
    outDir: 'dist/widget',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});