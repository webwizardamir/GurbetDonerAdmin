// Capture the header in both its transparent (top) and opaque (scrolled) state.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v8");
await mkdir(OUT, { recursive: true });

const BASE = process.env.BASE_URL ?? "http://localhost:4321/";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--no-proxy-server", "--autoplay-policy=no-user-gesture-required"],
});

async function shot(name, viewport, scrollY) {
  // reducedMotion=reduce so Lenis stays off and the scroll position is stable for capture.
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(600); // let the fade-in transition complete
  await page.screenshot({ path: join(OUT, name), fullPage: false });
  console.log("ok", name);
  await ctx.close();
}

await shot("20_header_top_desktop.png", { width: 1440, height: 700 }, 0);
await shot("21_header_scrolled_desktop.png", { width: 1440, height: 700 }, 600);
await shot("22_header_top_mobile.png", { width: 414, height: 700 }, 0);
await shot("23_header_scrolled_mobile.png", { width: 414, height: 700 }, 600);

// Mobile menu open state.
{
  const ctx = await browser.newContext({ viewport: { width: 414, height: 820 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.click("[data-mobile-toggle]");
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "24_mobile_menu_open.png") });
  console.log("ok 24_mobile_menu_open.png");
  await ctx.close();
}

await browser.close();
console.log("done");
