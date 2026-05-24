import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", args: ["--no-proxy-server"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(process.env.BASE_URL ?? "http://localhost:4321/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);

const data = await page.evaluate(() => {
  const hero = document.querySelector(".cine-hero");
  const cs = hero ? getComputedStyle(hero) : null;
  const root = getComputedStyle(document.documentElement);
  const video = document.querySelector("[data-hero-video]");
  const title = document.querySelector(".cine-hero__title");
  return {
    heroExists: !!hero,
    heroBg: cs && cs.backgroundColor,
    heroColor: cs && cs.color,
    rootEmeraldBlack: root.getPropertyValue("--color-emerald-black"),
    rootBrass: root.getPropertyValue("--color-brass"),
    rootBone: root.getPropertyValue("--color-bone"),
    bodyClass: document.body.className,
    videoReadyState: video && video.readyState,
    videoCurrentSrc: video && video.currentSrc,
    titleColor: title && getComputedStyle(title).color,
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
