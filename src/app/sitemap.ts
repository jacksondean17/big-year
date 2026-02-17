import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://bigyear.xyz";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/schedule`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/users`,
      lastModified: new Date(),
    },
  ];
}
