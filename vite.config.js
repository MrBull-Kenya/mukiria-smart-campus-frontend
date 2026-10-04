import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the browser talks to Vite only ("/api" and "/socket.io" are proxied to the backend).
// That avoids CORS problems and lets you run with HTTPS (needed for camera + GPS on a phone)
// without the "mixed content" block you'd get calling http://localhost:5000 from an https page.
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  const plugins = [react()];

  if (env.VITE_HTTPS === '1') {
    const { default: basicSsl } = await import('@vitejs/plugin-basic-ssl');
    plugins.push(basicSsl());
  }

  return {
    plugins,
    server: {
      port: 5173,
      host: true, // expose on LAN so a phone can open the dev server
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
  };
});
