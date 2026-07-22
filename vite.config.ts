import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    // Report compressed sizes to help observe the impact of optimizations
    reportCompressedSize: true,
    // Use terser for more aggressive JS minification (and ensure CSS is minified by Vite's pipeline)
    minify: 'terser',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'public/index.html'),
      },
      output: {
        // Split vendor (node_modules) into a separate chunk for better caching
        manualChunks(id) {
          if (id && id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
