import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const BASE_URL = (import.meta.env.VITE_SITE_URL || "https://garimplay.com.br").replace(/\/$/, "");

interface PageSEOProps {
  title: string;
  description: string;
  canonical: string;
  image?: string | null;
  type?: "website" | "article" | "product";
  noindex?: boolean;
}

export function PageSEO({
  title,
  description,
  canonical,
  image,
  type = "website",
  noindex = false,
}: PageSEOProps) {
  const canonicalUrl = new URL(canonical, BASE_URL).href;

  const fullTitle = title.includes("Garimplay") ? title : `${title} | Garimplay`;

  const imageUrl = image ? new URL(image, BASE_URL).href : `${BASE_URL}/og-image.png`;

  useEffect(() => {
    document
      .querySelectorAll('head [data-seo-prerender="true"], head [data-seo-default="true"]')
      .forEach((element) => element.remove());
  }, []);

  return (
    <Helmet>
      <title>{fullTitle}</title>

      <meta name="description" content={description} />

      <link rel="canonical" href={canonicalUrl} />

      <meta name="robots" content={noindex ? "noindex, follow" : "index, follow"} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Garimplay" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}
