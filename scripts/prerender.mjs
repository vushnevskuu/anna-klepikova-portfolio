import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const port = 4173
const previewUrl = `http://127.0.0.1:${port}/`

if (process.env.VERCEL) {
  console.log('Prerender skipped on Vercel (meta, JSON-LD, noscript fallback remain active).')
  process.exit(0)
}

function startPreview() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
      {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, VERCEL: '1' },
      },
    )

    let settled = false
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill('SIGTERM')
        reject(new Error('Preview server startup timed out'))
      }
    }, 30000)

    const onOutput = (chunk) => {
      const text = chunk.toString()
      if (!settled && (text.includes('127.0.0.1') || text.includes('Local:'))) {
        settled = true
        clearTimeout(timeout)
        resolve(child)
      }
    }

    child.stdout.on('data', onOutput)
    child.stderr.on('data', onOutput)
    child.on('error', (error) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(error)
      }
    })
  })
}

const preview = await startPreview()
let browser

try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('.portfolio-name', { timeout: 15000 })
  await page.waitForSelector('.portfolio-image--loaded', { timeout: 15000 }).catch(() => {})

  const rootHtml = await page.$eval('#root', (element) => element.innerHTML)
  const indexPath = join(root, 'dist/index.html')
  const indexHtml = readFileSync(indexPath, 'utf8')
  const updatedHtml = indexHtml.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${rootHtml}</div>`,
  )

  if (updatedHtml === indexHtml) {
    throw new Error('Could not inject prerendered markup into dist/index.html')
  }

  writeFileSync(indexPath, updatedHtml)
  console.log('Prerender injected into dist/index.html')
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
}
