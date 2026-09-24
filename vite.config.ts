import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      /** Client bundle: model id from VITE_GEMINI_MODEL or plain GEMINI_MODEL in `.env` (app default: gemini-2.5-flash when unset). */
      'process.env.GEMINI_MODEL': JSON.stringify(env.VITE_GEMINI_MODEL || env.GEMINI_MODEL || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@/shared': path.resolve(__dirname, 'src/shared'),
        '@/app': path.resolve(__dirname, 'src/app'),
        '@/features': path.resolve(__dirname, 'src/features'),
      },
    },
    server: {
      allowedHosts: ['giq.g2m.partners', 'giq.impact-ai.co.uk', 'giq.theleadai.co.uk'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
