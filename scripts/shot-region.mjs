// One-off region screenshots for visual review.
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

async function regionShot({ url, viewport, scrollTo, scrollY, file }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
  await page.waitForTimeout(2500);
  if (scrollTo) {
    await page.evaluate(({ sel, block }) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ block: block ?? "start", behavior: "auto" });
    }, { sel: scrollTo, block: "start" });
    await page.waitForTimeout(400);
  } else if (typeof scrollY === "number") {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(400);
  } else if (scrollY === "bottom") {
    await page.evaluate(() => {
      const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.scrollTo(0, max);
    });
    await page.waitForTimeout(500);
    // Verify and re-scroll if needed (in case content loaded late)
    await page.evaluate(() => {
      const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.scrollTo(0, max);
    });
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: join(OUT, file), fullPage: false });
  console.log("ok ", file);
  await ctx.close();
}

// Footer + bottom of DCTA transition: scroll to the very bottom of the page
await regionShot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 1440, height: 900 },
  scrollY: "bottom",
  file: "07_footer_zone.png",
});

// Certifications row
await regionShot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 1440, height: 900 },
  scrollTo: "#certifications",
  file: "08_certifications.png",
});

// Wave above Featured Products
await regionShot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 1440, height: 900 },
  scrollTo: ".feat",
  file: "09_feat_wave.png",
});

// Bottom of Halal section transitioning to Process
await regionShot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 1440, height: 900 },
  scrollTo: "#process",
  file: "10_halal_bottom.png",
});

await browser.close();
console.log("done");
