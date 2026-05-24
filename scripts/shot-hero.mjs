#!/usr/bin/env node
// Captures the v6 cinematic hero at three widths. Waits for fonts + GSAP intro to settle.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v6");
await mkdir(OUT, { recursive: true });

const SYS_CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
// localhost serves; 127.0.0.1 is intercepted by a local proxy here. --no-proxy-server keeps
// system Chrome off that proxy for local captures.
const BASE = process.env.BASE_URL ?? "http://localhost:4321/";
const browser = await chromium.launch({ executablePath: SYS_CHROME, headless: true, args: ["--no-sandbox", "--no-proxy-server"] });

async function shot({ viewport, file }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(2600); // GSAP headline intro settle
  await page.screenshot({ path: join(OUT, file), fullPage: false });
  console.log("ok  ", file);
  await ctx.close();
}

await shot({ viewport: { width: 1440, height: 900 }, file: "hero_desktop.png" });
await shot({ viewport: { width: 820, height: 1100 }, file: "hero_tablet.png" });
await shot({ viewport: { width: 390, height: 844 }, file: "hero_mobile.png" });

await browser.close();
console.log("done");
