#!/usr/bin/env node
// Download product + cert + hero assets from the old Melek site.
// Run with: node scripts/download-assets.mjs

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASE = "https://lightyellow-penguin-202886.hostingersite.com/wp-content/uploads/2025/11";

// slug -> { name, category, src filename on remote, local filename }
const PRODUCTS = [
  // Chicken
  { slug: "sliced-roasted-chicken-kebab", name: "Sliced & Roasted Chicken Kebab", category: "chicken", src: "new-chicken-1.jpg" },
  { slug: "chicken-kebab", name: "Chicken Kebab", category: "chicken", src: "ChickenKebab.png" },
  { slug: "chicken-burger", name: "Chicken Burger", category: "chicken", src: "Chickenburger.png" },
  { slug: "chicken-burger-2", name: "Chicken Burger (premium)", category: "chicken", src: "new-burger-1.jpg" },
  { slug: "chicken-nuggets", name: "Chicken Nuggets", category: "chicken", src: "ChickenNuggets-2.png" },
  { slug: "chicken-bites", name: "Chicken Bites", category: "chicken", src: "ChickenBites.png" },
  { slug: "chicken-meatball", name: "Chicken Meatball", category: "chicken", src: "ChickenMeatball.png" },
  { slug: "chicken-schnitzel", name: "Chicken Schnitzel", category: "chicken", src: "Chickenschnitzel.png" },
  { slug: "chicken-kipcorn", name: "Chicken Kipcorn", category: "chicken", src: "Chickenkipkorn-2.png" },
  { slug: "chicken-fingers-classic", name: "Chicken Fingers Classic", category: "chicken", src: "Chickenfingersclassic.png" },
  { slug: "chicken-formed-tenders-classic", name: "Chicken Formed Tenders Classic", category: "chicken", src: "Chickenformedtendersclasssic.png" },
  { slug: "chicken-formed-tenders-hot", name: "Chicken Formed Tenders Hot", category: "chicken", src: "Chickenformedtendershot.png" },
  { slug: "crispy-tenders-classic", name: "Crispy Tenders Classic", category: "chicken", src: "Crispytendersclassic.png" },
  { slug: "crispy-tenders-hot", name: "Crispy Tenders Hot", category: "chicken", src: "Crispytendershot.png" },
  { slug: "crispy-burger", name: "Crispy Burger", category: "chicken", src: "Crispyburger.png" },
  { slug: "crispy-wings", name: "Crispy Wings", category: "chicken", src: "Crispywings.png" },
  { slug: "crispy-hot-wings", name: "Crispy Hot Wings", category: "chicken", src: "Crispyhotwings.png" },
  { slug: "crispy-chicken-wings", name: "Crispy Chicken Wings", category: "chicken", src: "Crispychickenwings.png" },
  { slug: "chicken-wings-classic", name: "Chicken Wings Classic", category: "chicken", src: "Chickenwingsclassic.png" },
  { slug: "chicken-wings-hot", name: "Chicken Wings Hot", category: "chicken", src: "Chickenwingshot.png" },
  { slug: "chicken-wings-barbecue", name: "Chicken Wings Barbecue", category: "chicken", src: "Chickenwingsbarbecue.png" },
  { slug: "cordon-bleu", name: "Cordon Bleu", category: "chicken", src: "Cordonbleu.png" },

  // Beef
  { slug: "sliced-roasted-beef-kebab", name: "Sliced & Roasted Beef Kebab", category: "beef", src: "new-beef-1-1.jpg" },
  { slug: "beef-kebab", name: "Beef Kebab", category: "beef", src: "BeefKebab-1.png" },
  { slug: "sucuk-doner", name: "Sucuk Döner", category: "beef", src: "Sucukdoner-1.png" },
  { slug: "shawarma", name: "Shawarma", category: "beef", src: "shawarma-1.jpg" },
  { slug: "adana-kebab", name: "Adana Kebab", category: "beef", src: "adana-1.png" },
  { slug: "akcaabat", name: "Akcaabat", category: "beef", src: "akcaabat-1-1.png" },
  { slug: "cevapcici", name: "Cevapcici", category: "beef", src: "Cevapcici-1.png" },
  { slug: "zoogets", name: "Zoogets", category: "beef", src: "Zoogets.png" },
  { slug: "steak-haches", name: "Steak Haches", category: "beef", src: "steakhaches-1.png" },
  { slug: "beef-burger", name: "Beef Burger", category: "beef", src: "Beef-1.png" },
  { slug: "natural-burger", name: "Natural Burger", category: "beef", src: "naturalBurger-1.png" },
  { slug: "onion-burger", name: "Onion Burger", category: "beef", src: "onionBurger-1.png" },
  { slug: "spicy-burger", name: "Spicy Burger", category: "beef", src: "spicyBurger-1.png" },

  // Snacks (incl. fish, cheese, formed)
  { slug: "frikandel", name: "Frikandel", category: "snacks", src: "new-frik-1.jpg" },
  { slug: "mozzarella-sticks", name: "Mozzarella Sticks", category: "snacks", src: "Mozarellasticks-2-1.png" },
  { slug: "cheese-nuggets", name: "Cheese Nuggets", category: "snacks", src: "CheeseNuggets-2-1.png" },
  { slug: "chilli-cheese-nuggets", name: "Chilli Cheese Nuggets", category: "snacks", src: "Chilicheesenugget-1.png" },
  { slug: "potato-burger", name: "Potato Burger", category: "snacks", src: "Potatoburger.png" },
  { slug: "onion-rings", name: "Onion Rings", category: "snacks", src: "Onionrings.png" },
  { slug: "manti", name: "Manti", category: "snacks", src: "Manti.png" },
  { slug: "iskembe", name: "Iskembe", category: "snacks", src: "Iskembe.png" },
  { slug: "falafel", name: "Falafel", category: "snacks", src: "Falafel.png" },
  { slug: "fish-burger", name: "Fish Burger", category: "snacks", src: "Fishburger-2-1.png" },
  { slug: "crispy-panko-shrimp", name: "Crispy Panko Shrimp", category: "snacks", src: "Crispypankoshrimp-2-1.png" },
];

const TRUST_BADGES = [
  { src: "1min-1676932219279_1.png", local: "halal-certified.png" },
  { src: "2min-1676932223426_1.png", local: "no-hormones.png" },
  { src: "4min-1676932223421_1.png", local: "humanely-raised.png" },
  { src: "5min-1676932223419_1.png", local: "satisfaction.png" },
];

const HERO_IMAGES = [
  { src: "Generated-Image-November-09-2025-12_15AM-1-1.webp", local: "hero-spread.webp" },
  { src: "Generated-Image-November-09-2025-12_12AM-2-1.webp", local: "hero-platter.webp" },
  { src: "cows-stand-on-grass-looking-down-towards-the-camera.webp", local: "field.webp" },
];

async function fetchBuf(url) {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function downloadAll() {
  const productsDir = join(ROOT, "public", "images", "products");
  const trustDir = join(ROOT, "public", "images", "trust");
  const heroDir = join(ROOT, "public", "images", "hero");
  await mkdir(productsDir, { recursive: true });
  await mkdir(trustDir, { recursive: true });
  await mkdir(heroDir, { recursive: true });

  const tasks = [];

  for (const p of PRODUCTS) {
    const ext = p.src.split(".").pop();
    const local = join(productsDir, `${p.slug}.${ext}`);
    if (existsSync(local)) continue;
    tasks.push(
      fetchBuf(`${BASE}/${p.src}`)
        .then((buf) => writeFile(local, buf))
        .then(() => console.log("OK ", p.slug))
        .catch((e) => console.error("FAIL", p.slug, e.message)),
    );
  }

  for (const b of TRUST_BADGES) {
    const local = join(trustDir, b.local);
    if (existsSync(local)) continue;
    tasks.push(
      fetchBuf(`${BASE}/${b.src}`)
        .then((buf) => writeFile(local, buf))
        .then(() => console.log("OK ", b.local))
        .catch((e) => console.error("FAIL", b.local, e.message)),
    );
  }

  for (const h of HERO_IMAGES) {
    const local = join(heroDir, h.local);
    if (existsSync(local)) continue;
    tasks.push(
      fetchBuf(`${BASE}/${h.src}`)
        .then((buf) => writeFile(local, buf))
        .then(() => console.log("OK ", h.local))
        .catch((e) => console.error("FAIL", h.local, e.message)),
    );
  }

  await Promise.allSettled(tasks);
}

async function generateContent() {
  const dir = join(ROOT, "src", "content", "products");
  await mkdir(dir, { recursive: true });
  let order = 10;
  for (const p of PRODUCTS) {
    const ext = p.src.split(".").pop();
    const imageRef = `/images/products/${p.slug}.${ext}`;
    const fm = [
      "---",
      `name: "${p.name.replace(/"/g, '\\"')}"`,
      `category: ${p.category}`,
      `image: "${imageRef}"`,
      `featured: ${["chicken-kebab", "sliced-roasted-beef-kebab", "crispy-tenders-hot", "mozzarella-sticks", "chicken-nuggets", "frikandel"].includes(p.slug)}`,
      `order: ${order}`,
      "---",
      "",
    ].join("\n");
    const file = join(dir, `${p.slug}.md`);
    if (!existsSync(file)) {
      await writeFile(file, fm);
      console.log("MD ", p.slug);
    }
    order += 10;
  }
}

await downloadAll();
await generateContent();
console.log("done");
