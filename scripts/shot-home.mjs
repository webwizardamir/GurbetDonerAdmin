#!/usr/bin/env node
// Full homepage capture for the v6 cinematic redesign.
// Uses domcontentloaded (the 7MB hero video makes `load` hang) + forces .reveal
// visible so below-fold sections render. Writes desktop full, mobile full, and
// per-section desktop crops to temporary_screenshots/<SHOTS_DIR>/.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v6");
await mkdir(OUT, { recursive: true });

const SYS_CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
// localhost serves; 127.0.0.1 is intercepted by a local proxy here.
const BASE = process.env.BASE_URL ?? "http://localhost:4321/";
const browser = await chromium.launch({ executablePath: SYS_CHROME, headless: true, args: ["--no-sandbox", "--no-proxy-server"] });

async function prep(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.evaluate(() => {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
  });
  await page.waitForTimeout(1800);
  // GSAP's gsap.set hides [data-reveal] on load and only un-hides in-view items on scroll. A
  // non-scrolling capture leaves below-fold ones hidden, so force them visible AFTER gsap has run.
  await page.evaluate(() => {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.setProperty("opacity", "1", "important");
      el.style.setProperty("transform", "none", "important");
    });
  });
  await page.waitForTimeout(150);
}

async function full({ viewport, file }) {
  // reducedMotion=reduce keeps Lenis from initialising; otherwise smooth-scroll never settles
  // and element captures time out waiting for a "stable" target. Content is forced visible below.
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await prep(page);
  await page.screenshot({ path: join(OUT, file), fullPage: true });
  console.log("ok  ", file);
  await ctx.close();
}

async function crop({ selector, file, width = 1440 }) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await prep(page);
  const el = await page.$(selector);
  if (el) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await el.screenshot({ path: join(OUT, file) });
    console.log("ok  ", file);
  } else {
    console.log("MISS", file, selector);
  }
  await ctx.close();
}

await full({ viewport: { width: 1440, height: 900 }, file: "home_desktop_full.png" });
await full({ viewport: { width: 390, height: 844 }, file: "home_mobile_full.png" });

for (const c of [
  { selector: ".proof", file: "sec_proof.png" },
  { selector: ".story", file: "sec_story.png" },
  { selector: ".worlds", file: "sec_worlds.png" },
  { selector: ".halal2", file: "sec_halal.png" },
  { selector: ".xcta", file: "sec_xcta.png" },
  { selector: ".certs2", file: "sec_trust.png" },
]) {
  await crop(c);
}

await browser.close();
console.log("done");
