export type AmazonMetadata = {
  title: string | null;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
};

function clean(value: string | null | undefined): string | null {
  if (!value) return null;

  return value.replace(/\s+/g, " ").trim() || null;
}

function parseAmazonPrice(value: string | null): number | null {
  if (!value) return null;

  const match = value.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);

  if (!match) return null;

  const price = Number(match[1].replace(/\./g, "").replace(",", "."));

  return Number.isFinite(price) && price > 0 ? price : null;
}

function getAmazonImage(document: Document): string | null {
  const image = document.querySelector("#landingImage, #imgBlkFront");

  if (!image) return null;

  const dynamicImages = image.getAttribute("data-a-dynamic-image");

  if (dynamicImages) {
    try {
      const parsed = JSON.parse(dynamicImages) as Record<string, number[]>;

      const images = Object.entries(parsed);

      // Prioriza a imagem com maior área.
      images.sort((a, b) => {
        const areaA = (a[1]?.[0] ?? 0) * (a[1]?.[1] ?? 0);
        const areaB = (b[1]?.[0] ?? 0) * (b[1]?.[1] ?? 0);

        return areaB - areaA;
      });

      if (images[0]?.[0]) {
        return images[0][0];
      }
    } catch {
      // Ignora metadados inválidos.
    }
  }

  return clean(image.getAttribute("data-old-hires")) ?? clean(image.getAttribute("src"));
}

function getAmazonPrice(document: Document): number | null {
  const selectors = [
    "#corePrice_feature_div .priceToPay .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen",
    "#corePrice_feature_div .a-price .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);

    const price = parseAmazonPrice(clean(element?.textContent));

    if (price !== null) return price;
  }

  return null;
}

function getAmazonOriginalPrice(document: Document): number | null {
  const selectors = [
    "#corePrice_feature_div .basisPrice .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen",
    "#corePrice_feature_div .a-text-price .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);

    const price = parseAmazonPrice(clean(element?.textContent));

    if (price !== null) return price;
  }

  return null;
}

export function extractAmazonMetadata(document: Document): AmazonMetadata {
  const rawTitle =
    clean(document.querySelector("#productTitle")?.textContent) ??
    clean(document.querySelector('meta[property="og:title"]')?.getAttribute("content")) ??
    clean(document.querySelector("title")?.textContent);

  const title = rawTitle?.replace(/\s*:\s*Amazon\.com\.br\s*:\s*.*$/i, "").trim() || null;

  const imageUrl = getAmazonImage(document);

  const price = getAmazonPrice(document);
  const extractedOriginalPrice = getAmazonOriginalPrice(document);

  const originalPrice =
    price !== null && extractedOriginalPrice !== null && extractedOriginalPrice > price
      ? extractedOriginalPrice
      : null;

  return {
    title,
    imageUrl,
    price,
    originalPrice,
  };
}
