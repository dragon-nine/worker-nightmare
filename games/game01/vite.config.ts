import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** /game01 → /game01/ 리다이렉트 (dev server) */
function trailingSlashRedirect(): Plugin {
  return {
    name: 'trailing-slash-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/game01') {
          res.writeHead(301, { Location: '/game01/' });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), trailingSlashRedirect()],
  base: '/game01/',
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: '../../dist/game01',
    emptyOutDir: true,
  },
})
