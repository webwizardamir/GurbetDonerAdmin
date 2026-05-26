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
    "Halal frozen chicken, beef and snacks for distributors, retailers and HoReCa partners across Europe.",
  origin: "Europe",
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
} as const;

export type ProductCategorySlug = (typeof site.productCategories)[number]["slug"];
