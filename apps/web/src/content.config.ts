import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    name: z.string(),
    category: z.enum(["chicken", "beef", "snacks"]),
    weight: z.string().optional(),
    tagline: z.string().optional(),
    image: z.string().optional(),
    badges: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(100),
  }),
});

export const collections = { products };
