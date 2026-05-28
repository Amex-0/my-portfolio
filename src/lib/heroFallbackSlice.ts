import type { Content } from "@prismicio/client";

/** Development fallback when Prismic homepage is not set up yet. */
export const heroFallbackSlice: Content.HeroSlice = {
  id: "hero-fallback",
  slice_type: "hero",
  slice_label: null,
  variation: "default",
  version: "initial",
  primary: {
    name: "Aman Bedilu",
    title: "Frontend Developer",
    subtitle:
      "Frontend developer and Information Systems student at Addis Ababa University, building reliable React and Next.js experiences with clean UI, testing discipline, and practical integrations.",
    cta_text: "View Experience",
    cta_link: {
      link_type: "Web",
      url: "#experience",
      target: "_self",
    },
  },
  items: [],
};
