export const site = {
  // Live since 2026-06-25: site is public and indexable. When false the whole
  // site emits noindex,nofollow and robots.txt disallows crawling (test deploy).
  indexable: true,
  name: "Melek",
  fullName: "Melek Halal Food",
  domain: "melekhalalfood.nl",
  url: "https://melekhalalfood.nl",
  // Customer portal (separate admin app on the app subdomain). Used by the header
  // "Inloggen" link so existing customers can reach their portal login.
  portalUrl: "https://app.melekhalalfood.nl/portal/login",
  tagline: "Halal, perfected. Crafted in Europe.",
  description:
    "Halal frozen meat, chicken, snacks, rice and olives for distributors, retailers and Horeca partners across Europe.",
  origin: "Europe",
  reach: "Across Europe",
  email: "info@melekhalalfood.nl",
  emailGeneral: "info@melekhalalfood.nl",
  phone: "071 200 1287",
  address: {
    line1: "Weversbaan 8a",
    area: "De Baanderij",
    postal: "2352 BZ",
    city: "Leiden",
    country: "The Netherlands",
  },
  hours: "Closes at 17:00 (CET)",
  social: {
    instagram: "https://www.instagram.com/MelekHalalFoodBenelux/",
    linkedin: "https://www.linkedin.com/company/melekhalalfood",
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products/" },
    { label: "About", href: "/about/" },
    { label: "Distributors", href: "/distributors/" },
    { label: "Contact", href: "/contact/" },
  ],
  // Food categories: the primary, visible browse axis (rail, tabs, nav).
  // Display order is used as the tab order and the products grid sort.
  productCategories: [
    {
      slug: "meat",
      name: "Meat",
      description: "Halal beef kebab, köfte, burgers, döner, cevapcici and more.",
    },
    {
      slug: "chicken",
      name: "Chicken",
      description: "Halal chicken kebab, nuggets, tenders, wings and schnitzel.",
    },
    {
      slug: "potato",
      name: "Potato",
      description: "Potato burgers, falafel and onion rings.",
    },
    {
      slug: "snacks",
      name: "Snacks",
      description: "Cheese sticks, cheese nuggets, fish burger and panko shrimp.",
    },
    {
      slug: "rice",
      name: "Rice",
      description: "Extra long grain Sella basmati rice.",
    },
    {
      slug: "olives",
      name: "Olives",
      description: "Green olives and Turkish pickles (turşu).",
    },
  ],
  // Secondary axis (packaging vs box), shown as an in-widget toggle, not in nav.
  productFormats: [
    {
      slug: "packaging",
      name: "Packaging",
      description: "Retail packs for shops and supermarket shelves.",
    },
    {
      slug: "box",
      name: "Box",
      description: "Bulk cases for foodservice and wholesale.",
    },
  ],
} as const;

export type ProductCategorySlug = (typeof site.productCategories)[number]["slug"];
export type ProductFormatSlug = (typeof site.productFormats)[number]["slug"];
