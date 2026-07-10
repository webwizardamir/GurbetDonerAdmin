// Product access for the public catalogue. The visible browse axis is the food
// `category` (Meat, Chicken, Potato, Snacks, Rice, Olives); `format`
// (packaging/box) is a secondary filter handled client-side in ProductBrowser.
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

// Category display order, taken from site.productCategories.
const categoryOrder: string[] = site.productCategories.map((c) => c.slug);

const byCategoryThenOrder = (a: ProductItem, b: ProductItem) =>
  categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
  a.order - b.order;

// Flat list of every product with an image, sorted by category then order.
// The ProductBrowser renders all of these once and filters them client-side by
// category + format + name, so no per-group query is needed.
export async function getAllProducts(): Promise<ProductItem[]> {
  try {
    const all = await getCollection("products");
    return all
      .map((p) => ({
        id: p.id,
        name: p.data.name,
        category: p.data.category,
        format: p.data.format,
        weight: p.data.weight,
        image: p.data.image,
        order: p.data.order ?? 100,
      }))
      .filter((p) => p.image)
      .sort(byCategoryThenOrder);
  } catch {
    return [];
  }
}
