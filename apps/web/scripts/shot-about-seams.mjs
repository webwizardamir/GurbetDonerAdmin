import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v7b");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, args: ["--no-sandbox"],
});
async function atSelector(sel, file, offset = 120) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 700 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4321/about/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
  await page.waitForTimeout(2500);
  await page.evaluate(({ s, o }) => {
    const el = document.querySelector(s);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o);
  }, { s: sel, o: offset });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, file), fullPage: false });
  console.log("ok", file);
  await ctx.close();
}
// gallery -> halal seam (the old beige bug)
await atSelector("#halal", "10_gallery_halal_seam.png", 220);
// bottom: scroll to the very end (footer)
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4321/about/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "11_footer_zone.png"), fullPage: false });
console.log("ok 11_footer_zone.png");
await ctx.close();
await browser.close();
console.log("done");
