/**
 * layoutSaverPlugin — dev-only Vite middleware that accepts POST /api/save-layout
 * and writes the editor's state to JSON files on disk ("bake into code").
 *
 * Usage in vite.config.ts:
 *
 *   import { layoutSaverPlugin } from './lovable-editor-kit/vite-plugin-save-layout'
 *
 *   export default defineConfig({
 *     plugins: [react(), layoutSaverPlugin()],
 *   })
 *
 * CAVEAT for Lovable: this requires you to actually edit vite.config.ts yourself
 * (e.g. via Lovable's GitHub sync / local clone) and run a real Vite dev server —
 * it will NOT work if you're only using Lovable's hosted AI-chat editor with no
 * direct file/server access, since there's nowhere for the middleware to hook in.
 * In that case, skip this file entirely — EditorContext still works fine with
 * localStorage-only persistence (pass `saveEndpoint={null}` to EditorProvider).
 */
import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'

export function layoutSaverPlugin(options?: {
  layoutPath?: string
  dynamicElementsPath?: string
}): Plugin {
  const layoutPath = options?.layoutPath ?? 'src/data/layout.json'
  const dynamicPath = options?.dynamicElementsPath ?? 'src/data/dynamicElements.json'

  return {
    name: 'layout-saver-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/save-layout' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const data = JSON.parse(body.toString())

              fs.mkdirSync(path.dirname(path.resolve(process.cwd(), layoutPath)), { recursive: true })
              fs.writeFileSync(path.resolve(process.cwd(), layoutPath), JSON.stringify(data.layout ?? {}, null, 2), 'utf-8')

              fs.mkdirSync(path.dirname(path.resolve(process.cwd(), dynamicPath)), { recursive: true })
              fs.writeFileSync(path.resolve(process.cwd(), dynamicPath), JSON.stringify(data.dynamicElements ?? [], null, 2), 'utf-8')

              res.statusCode = 200
              res.end('Layout saved')
            } catch (e) {
              console.error('[layout-saver-plugin] Error saving layout:', e)
              res.statusCode = 500
              res.end('Error saving layout')
            }
          })
        } else {
          next()
        }
      })
    },
  }
}
