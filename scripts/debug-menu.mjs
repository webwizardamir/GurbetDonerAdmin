import { chromium } from "playwright";
const SYS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath: SYS_CHROME, headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 414, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
const beforeClick = await page.evaluate(() => {
  const p = document.querySelector("[data-mobile-panel]");
  const t = document.querySelector("[data-mobile-toggle]");
  const cs = p ? getComputedStyle(p) : null;
  return {
    panelExists: !!p,
    toggleExists: !!t,
    state: p?.getAttribute("data-state"),
    aria: t?.getAttribute("aria-expanded"),
    opacity: cs?.opacity,
    pointerEvents: cs?.pointerEvents,
    position: cs?.position,
    zIndex: cs?.zIndex,
    bg: cs?.backgroundColor,
  };
});
console.log("BEFORE click:", JSON.stringify(beforeClick, null, 2));

await page.click("[data-mobile-toggle]");
await page.waitForTimeout(700);

const afterClick = await page.evaluate(() => {
  const p = document.querySelector("[data-mobile-panel]");
  const t = document.querySelector("[data-mobile-toggle]");
  const cs = p ? getComputedStyle(p) : null;
  return {
    state: p?.getAttribute("data-state"),
    aria: t?.getAttribute("aria-expanded"),
    opacity: cs?.opacity,
    visibility: cs?.visibility,
    display: cs?.display,
    zIndex: cs?.zIndex,
    rect: p?.getBoundingClientRect ? (() => { const r = p.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; })() : null,
    headTextSnippet: p?.querySelector(".mobile-menu__eyebrow")?.textContent,
  };
});
console.log("AFTER click :", JSON.stringify(afterClick, null, 2));

// Force open via direct DOM
await page.evaluate(() => {
  const p = document.querySelector("[data-mobile-panel]");
  if (p) {
    p.setAttribute("data-state", "open");
    p.setAttribute("aria-hidden", "false");
  }
});
await page.waitForTimeout(500);
const forced = await page.evaluate(() => {
  const p = document.querySelector("[data-mobile-panel]");
  const cs = p ? getComputedStyle(p) : null;
  return { state: p?.getAttribute("data-state"), opacity: cs?.opacity, zIndex: cs?.zIndex };
});
console.log("FORCED      :", JSON.stringify(forced, null, 2));

await page.screenshot({ path: "D:/Projects/melek-halal-food-frontend/temporary_screenshots/v2/_debug_menu.png" });
await browser.close();
