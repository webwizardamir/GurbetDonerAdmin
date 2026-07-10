import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    name: z.string(),
    // Food category — the primary, visible browse axis (tabs + rail + nav).
    category: z.enum(["meat", "chicken", "potato", "snacks", "rice", "olives"]),
    // Secondary axis: retail packs (packaging) vs bulk/foodservice cases (box).
    // Kept fully functional as an in-widget toggle, no longer a top-level nav.
    format: z.enum(["packaging", "box"]).default("packaging"),
    weight: z.string().optional(),
    tagline: z.string().optional(),
    image: z.string().optional(),
    badges: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(100),
  }),
});

export const collections = { products };
