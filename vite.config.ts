import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: process.env.BASE_PATH || '/',
    plugins: [sites(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },
    server: {
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      rollupOptions: {
        output: {
          assetFileNames(asset) {
            if (asset.names.includes('eng.traineddata.gz')) return 'assets/ocr-[hash]/[name][extname]';
            return 'assets/[name]-[hash][extname]';
          },
          manualChunks(moduleId) {
            if (!moduleId.includes('node_modules')) return;
            if (moduleId.includes('pdf-lib') || moduleId.includes('pdfjs-dist')) return 'pdf-vendor';
            if (moduleId.includes('react')) return 'react-vendor';
            if (moduleId.includes('lucide-react')) return 'ui-vendor';
          },
        },
      },
    },
  };
});
