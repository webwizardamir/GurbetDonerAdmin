#!/usr/bin/env node
// Uses Playwright with the SYSTEM Chrome (no bundled Chromium download needed).
// Captures the v2 screenshot set including interactive states (mobile menu open).
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v3");
await mkdir(OUT, { recursive: true });

const SYS_CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({
  executablePath: SYS_CHROME,
  headless: true,
  args: ["--no-sandbox"],
});

async function shot({ url, viewport, file, action }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  // Force-reveal scroll-animated sections so full-page screenshots show them.
  await page.evaluate(() => {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
  });
  // Give YouTube iframe time to load + start playback so its title overlay fades.
  await page.waitForTimeout(2500);
  if (action) await action(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, file), fullPage: viewport.fullPage ?? true });
  console.log("ok  ", file);
  await ctx.close();
}

await shot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 1440, height: 900 },
  file: "01_home_desktop.png",
});

await shot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 1440, height: 900, fullPage: false },
  file: "02_home_hero.png",
});

await shot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 414, height: 800 },
  file: "03_home_mobile.png",
});

await shot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 820, height: 1100 },
  file: "05_home_tablet.png",
});

// Mobile menu open: click the toggle (works because Playwright waits for the listener).
await shot({
  url: "http://127.0.0.1:4321/",
  viewport: { width: 414, height: 900, fullPage: false },
  file: "04_mobile_menu_open.png",
  action: async (page) => {
    // Give Header.astro's module script a beat to attach its click handler.
    // (Can't use networkidle because the YouTube hero iframe keeps the network active.)
    await page.waitForTimeout(800);
    await page.click("[data-mobile-toggle]");
    await page.waitForFunction(() => {
      const el = document.querySelector("[data-mobile-panel]");
      return el && el.getAttribute("data-state") === "open";
    });
    await page.waitForTimeout(500); // transition settle
  },
});

// Hover state on a category card (desktop).
await shot({
  url: "http://127.0.0.1:4321/#categories",
  viewport: { width: 1440, height: 900, fullPage: false },
  file: "06_categories_hover.png",
  action: async (page) => {
    await page.waitForSelector(".cats__card");
    await page.hover(".cats__card");
  },
});

await browser.close();
console.log("done");
