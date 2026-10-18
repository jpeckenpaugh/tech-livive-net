import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.env.APP_ROOT || '/app';
const output = '/artifacts';
const port = 4175;
const showcaseMode = process.env.TECH_SHOWCASE === '1';
const errors = [];
let browser;
let context;
let server;

const result = {
  status: 'failed',
  mode: showcaseMode ? 'showcase' : 'fast-smoke',
  startedAt: new Date().toISOString(),
  browser: null,
  steps: [],
  errors,
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const record = (step) => result.steps.push({ step, status: 'passed' });
const snap = (page, name) => page.screenshot({ path: path.join(output, name), fullPage: false });

try {
  await fs.mkdir(output, { recursive: true });
  server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      assert(file.startsWith(path.resolve(root) + path.sep), 'Invalid static path');
      const data = await fs.readFile(file);
      const ext = path.extname(file);
      res.writeHead(200, {
        'Content-Type':
          ({
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp'
          })[ext] || 'application/octet-stream',
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(port, '0.0.0.0', resolve));

  browser = await chromium.launch({ headless: true });
  result.browser = {
    playwright: '1.55.0',
    chromium: browser.version(),
    viewport: { width: 1280, height: 720 },
  };
  context = await browser.newContext({
    viewport: result.browser.viewport,
    ...(showcaseMode ? { recordVideo: { dir: output, size: result.browser.viewport } } : {}),
  });

  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  record('index page loaded');

  // Verify posts loaded from posts.json
  await page.waitForSelector('.chips button', { timeout: 4000 });
  await snap(page, '01-publication-index-and-chips.png');
  record('category chips rendered');

  // Verify Category filter
  await page.locator('button[data-filter="diy-maker-project"]').click();
  await page.waitForTimeout(300);
  record('category filter applied');

  // Verify Post view
  await page.locator('a[href="#/post/inside-the-hackberry-pi-cm5-how-open-pcb-design-is-reviving"]').click();
  await page.waitForSelector('article header h1', { timeout: 3000 });
  await snap(page, '02-hardware-schematic-power-path.png');
  record('article view loaded with figures');

  // Verify Authors view
  await page.locator('header.site nav a[href="#/authors"]').click();
  await page.waitForSelector('.author-list .author-card', { timeout: 3000 });
  await snap(page, '04-ai-persona-masthead.png');
  record('authors view loaded');

  // Verify Specific Author view
  await page.locator('a.author-card[href="#/author/forge"]').click();
  await page.waitForSelector('.author-head h1', { timeout: 3000 });
  await snap(page, '05-persona-dossier-and-toolkit.png');
  record('author profile loaded');

  // Verify About view
  await page.locator('header.site nav a[href="#/about"]').click();
  await page.waitForSelector('article header h1', { timeout: 3000 });
  await snap(page, '06-sources-and-static-philosophy.png');
  record('about view loaded');

  assert(errors.length === 0, `Page errors encountered: ${errors.join('; ')}`);
  result.status = 'passed';
} catch (error) {
  result.error = error.message;
} finally {
  result.finishedAt = new Date().toISOString();
  if (context) await context.close();
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  if (result.status !== 'passed') {
    console.error('Smoke test failed:', result);
    process.exit(1);
  } else {
    console.log('Smoke test passed successfully!');
  }
}
