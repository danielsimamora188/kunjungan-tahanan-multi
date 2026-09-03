import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import * as esbuild from 'esbuild';

function buildApiPlugin(): Plugin {
  return {
    name: 'build-api-plugin',
    apply: 'build',
    async closeBundle() {
      try {
        await esbuild.build({
          entryPoints: [path.resolve(__dirname, 'server.ts')],
          bundle: true,
          platform: 'node',
          format: 'esm',
          packages: 'external',
          outfile: path.resolve(__dirname, 'api/index.js'),
        });
        console.log('✓ api/index.js successfully bundled for Vercel Serverless (ESM)');
      } catch (err) {
        console.error('Failed to bundle api/index.js:', err);
        throw err;
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), buildApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
