// Single source for grouping products by the visible Packaging/Box format.
// Meat (`category`) is used only as a hidden secondary sort so each format grid
// clusters all chicken, then beef, then snacks — no meat labels are shown.
import { getCollection } from "astro:content";
import { site } from "./site";

export type ProductItem = {
  id: string;
  name: string;
  category: string;
  format: string;
  weight?: string;
  image?: string;
  order: number;
};

// Hidden secondary sort order, taken from productCategories.
const meatOrder = site.productCategories.map((c) => c.slug);

const byMeatThenOrder = (a: ProductItem, b: ProductItem) =>
  meatOrder.indexOf(a.category) - meatOrder.indexOf(b.category) || a.order - b.order;

// Returns one group per format (Packaging, Box), each with its items already
// sorted. Products without an image are dropped (catalogue needs a packshot).
export async function getProductsByFormat() {
  let products: ProductItem[] = [];
  try {
    const all = await getCollection("products");
    products = all
      .map((p) => ({
        id: p.id,
        name: p.data.name,
        category: p.data.category,
        format: p.data.format,
        weight: p.data.weight,
        image: p.data.image,
        order: p.data.order ?? 100,
      }))
      .filter((p) => p.image);
  } catch {}

  return site.productFormats.map((f) => ({
    ...f,
    items: products.filter((p) => p.format === f.slug).sort(byMeatThenOrder),
  }));
}
