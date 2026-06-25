import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    name: z.string(),
    // Meat type — kept only as a hidden secondary sort within each format.
    category: z.enum(["chicken", "beef", "snacks"]),
    // Visible category: retail packs (packaging) vs bulk/foodservice cases (box).
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
