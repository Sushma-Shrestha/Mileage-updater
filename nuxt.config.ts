import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      msalClientId: process.env.MSAL_CLIENT_ID ?? "",
      oneDriveFileId: process.env.ONEDRIVE_FILE_ID ?? "",
      oneDriveDriveId: process.env.ONEDRIVE_DRIVE_ID ?? "",
      oneDriveItemId: process.env.ONEDRIVE_ITEM_ID ?? "",
    },
  },

  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "Mileage Tracker",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap",
        },
      ],
    },
  },
});
