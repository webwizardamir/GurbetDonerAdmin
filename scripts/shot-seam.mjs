// Capture a tight viewport AT the FeaturedProducts→Halal seam to spot any white gap.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v4");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

const ctx = await browser.newContext({ viewport: { width: 1440, height: 600 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const el = document.querySelector("#halal");
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY;
    // Scroll so the halal top sits at viewport y=80
    window.scrollTo(0, top - 80);
  }
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "11_cream_to_halal_seam.png"), fullPage: false });
console.log("ok 11");
await browser.close();
