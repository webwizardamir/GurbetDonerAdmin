import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v7");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, args: ["--no-sandbox"],
});
async function region(sel, file, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4321/about/", { waitUntil: "load" });
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
  await page.waitForTimeout(3000);
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: "start" }); }, sel);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, file), fullPage: false });
  console.log("ok", file);
  await ctx.close();
}
await region("#virtual-tour", "03_virtual_tour.png");
await region(".ab-gallery", "04_gallery.png");
await region(".ab-video", "05_video.png");
// mobile full
const ctx = await browser.newContext({ viewport: { width: 414, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4321/about/", { waitUntil: "load" });
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
await page.waitForTimeout(3000);
await page.screenshot({ path: join(OUT, "06_about_mobile.png"), fullPage: true });
console.log("ok 06_about_mobile.png");
await ctx.close();
await browser.close();
console.log("done");
