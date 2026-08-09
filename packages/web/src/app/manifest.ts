import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "fondof",
    short_name: "fondof",
    description:
      "Forge fitted coding skills from what you learn. Hand them to any agent.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#e55039",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
