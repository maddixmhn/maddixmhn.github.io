import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://maddixmhn.github.io",
  trailingSlash: "always",
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes("/dashboard/"),
      i18n: { defaultLocale: "en", locales: { en: "en", fa: "fa" } },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
