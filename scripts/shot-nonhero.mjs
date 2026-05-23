// Verify non-hero routes correctly offset main below the fixed header.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v5");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

async function shot(name, url, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, name), fullPage: false });
  console.log("ok", name);
  await ctx.close();
}

await shot("24_about_top.png", "http://127.0.0.1:4321/about/", { width: 1440, height: 700 });
await shot("25_products_top.png", "http://127.0.0.1:4321/products/", { width: 1440, height: 700 });
await browser.close();
console.log("done");
