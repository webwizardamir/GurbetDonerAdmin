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
    "Premium halal frozen foods produced in the Netherlands and shipped across Europe. Chicken, beef and snack ranges for distributors, retailers and HoReCa partners.",
  origin: "Netherlands",
  reach: "Across Europe",
  email: "info@melekhalalfood.nl",
  emailGeneral: "info@melekhalalfood.nl",
  phone: "+31 6 21 62 61 71",
  phoneSecondary: "071 200 12 87",
  address: {
    line1: "Industrieweg 00",
    postal: "1000 AA",
    city: "Amsterdam",
    country: "The Netherlands",
  },
  social: {
    instagram: "https://www.instagram.com/MelekHalalFoodBenelux/",
    linkedin: "https://www.linkedin.com/company/melekhalalfood",
  },
  nav: [
    { label: "Products", href: "/products/" },
    { label: "About", href: "/about/" },
    { label: "Distributors", href: "/distributors/" },
    { label: "Contact", href: "/contact/" },
  ],
  productCategories: [
    {
      slug: "chicken",
      name: "Chicken",
      tagline: "Halal-certified poultry, prepared with precision.",
      description:
        "Marinated kebab, hand-crafted nuggets, succulent tenders, wings and schnitzel. Produced under strict halal protocols and built for foodservice.",
    },
    {
      slug: "beef",
      name: "Beef",
      tagline: "Robust, deeply flavoured cuts and formed beef.",
      description:
        "Sahara-style beef kebab, cevapcici, köfte and char-ready burgers. Sourced and processed for consistency at scale.",
    },
    {
      slug: "snacks",
      name: "Snacks",
      tagline: "Crispy frozen favourites that keep moving.",
      description:
        "Mozzarella sticks, kipcorn, frikandel, falafel. The high-rotation snack range every cabinet needs.",
    },
  ],
} as const;

export type ProductCategorySlug = (typeof site.productCategories)[number]["slug"];
