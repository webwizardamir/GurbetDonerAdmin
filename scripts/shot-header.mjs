// Capture the header in both its transparent (top) and opaque (scrolled) state.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "temporary_screenshots", process.env.SHOTS_DIR ?? "v5");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

async function shot(name, viewport, scrollY) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
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

await browser.close();
console.log("done");
