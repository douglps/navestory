import { chromium } from "@playwright/test";

const outDir = "C:/Users/dougl/AppData/Local/Temp/claude/C--Dev-Nave/946c00c2-4510-4202-825a-b8e64005195d/scratchpad";

const pages = [
  { url: "http://localhost:3000/", file: "landing.png" },
  { url: "http://localhost:3000/login", file: "login.png" },
  { url: "http://localhost:3000/register", file: "register.png" },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

for (const p of pages) {
  // primeiro load compila a rota no Next dev; segundo load garante CSS já servido
  await page.goto(p.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/${p.file}` });
  console.log(`saved ${p.file}`);
}

await browser.close();
