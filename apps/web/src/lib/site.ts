export const site = {
  // Set to true only for the production launch. While false the whole site emits
  // noindex,nofollow and robots.txt disallows crawling (test deploy).
  indexable: false,
  name: "Melek",
  fullName: "Melek Halal Food",
  domain: "melekhalalfood.nl",
  url: "https://melekhalalfood.nl",
  tagline: "Halal, perfected. Crafted in Europe.",
  description:
    "Halal frozen chicken, beef and snacks for distributors, retailers and Horeca partners across Europe.",
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
  productCategories: [
    {
      slug: "chicken",
      name: "Chicken",
      tagline: "Halal chicken.",
      description: "Kebab, nuggets, tenders, wings and schnitzel.",
    },
    {
      slug: "beef",
      name: "Beef",
      tagline: "Halal beef.",
      description: "Beef kebab, cevapcici, köfte and burgers.",
    },
    {
      slug: "snacks",
      name: "Snacks",
      tagline: "Crispy frozen snacks.",
      description: "Mozzarella sticks, kipcorn, frikandel, falafel and more.",
    },
  ],
  // Visible product categories (the menu axis). Within each, items are sorted by
  // meat (productCategories order) as a hidden secondary key.
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
