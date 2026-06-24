import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v4");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, args: ["--no-sandbox"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 500 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
await page.waitForTimeout(2500);
// Scroll to where the marquee should be (just below the hero)
await page.evaluate(() => {
  const m = document.querySelector(".mq");
  if (m) {
    const top = m.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - 120);
  }
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "12_marquee.png"), fullPage: false });
console.log("ok 12");
await browser.close();
