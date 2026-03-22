import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, extname } from 'path'
import type { Plugin } from 'vite'
import { createReadStream, existsSync, statSync, writeFileSync, mkdirSync } from 'fs'

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function serveStatic(prefix: string, dir: string, fallback?: string) {
  return (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (s?: string) => void }, next: () => void) => {
    if (!req.url?.startsWith(prefix)) return next()
    const rel = req.url.slice(prefix.length).replace(/^\//, '').split('?')[0] || 'index.html'
    const filePath = resolve(dir, rel)
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const mime = MIME[extname(filePath)] || 'application/octet-stream'
      res.setHeader('Content-Type', mime)
      createReadStream(filePath).pipe(res as unknown as NodeJS.WritableStream)
    } else if (fallback && existsSync(resolve(dir, fallback))) {
      res.setHeader('Content-Type', 'text/html')
      createReadStream(resolve(dir, fallback)).pipe(res as unknown as NodeJS.WritableStream)
    } else {
      next()
    }
  }
}

function localMiddlewares(): Plugin {
  const gamePublic = resolve(__dirname, '../games/game01/public')
  const gameDist = resolve(__dirname, '../dist/game01')
  const layoutDir = resolve(gamePublic, 'layout')
  return {
    name: 'local-middlewares',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.match(/^\/admin(\?|$)/)) req.url = '/admin/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '')
        next()
      })
      // Save layout JSON locally
      server.middlewares.use(((req: { url?: string; method?: string }, res: { setHeader: (k: string, v: string) => void; end: (s?: string) => void; statusCode?: number }, next: () => void) => {
        if (req.method !== 'POST' || !req.url?.startsWith('/api/save-layout')) return next()
        const url = new URL(req.url, 'http://localhost')
        const filename = url.searchParams.get('filename')
        if (!filename) { res.statusCode = 400; res.end('filename required'); return }
        let body = ''
        ;(req as unknown as NodeJS.ReadableStream).on('data', (chunk: Buffer) => { body += chunk.toString() })
        ;(req as unknown as NodeJS.ReadableStream).on('end', () => {
          try {
            mkdirSync(layoutDir, { recursive: true })
            writeFileSync(resolve(layoutDir, filename), body, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (err) {
            res.statusCode = 500
            res.end(String(err))
          }
        })
      }) as never)
      server.middlewares.use(serveStatic('/game01', gameDist, 'index.html') as never)
      server.middlewares.use(serveStatic('/game-assets', gamePublic) as never)
    },
  }
}

export default defineConfig({
  plugins: [react(), localMiddlewares()],
  base: '/admin/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: '../dist/admin',
    emptyOutDir: true,
  },
  server: {
  },
})
