// Capture the products catalog + a sample detail page on desktop + mobile.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v6");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

async function shot({ url, viewport, file, fullPage = true }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, file), fullPage });
  console.log("ok", file);
  await ctx.close();
}

await shot({ url: "http://127.0.0.1:4321/products/", viewport: { width: 1440, height: 900 }, file: "30_products_desktop.png" });
await shot({ url: "http://127.0.0.1:4321/products/", viewport: { width: 414, height: 900 }, file: "31_products_mobile.png" });
await shot({ url: "http://127.0.0.1:4321/products/chicken-kebab/", viewport: { width: 1440, height: 900 }, file: "32_product_detail_desktop.png" });
await shot({ url: "http://127.0.0.1:4321/products/chicken-kebab/", viewport: { width: 414, height: 900 }, file: "33_product_detail_mobile.png" });
await shot({ url: "http://127.0.0.1:4321/products/chicken-kebab/", viewport: { width: 1440, height: 900 }, file: "34_product_detail_top.png", fullPage: false });

await browser.close();
console.log("done");
