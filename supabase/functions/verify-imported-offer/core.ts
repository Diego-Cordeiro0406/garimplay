export type Target = { store: string; id: string; url: string };
const plain = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function targetFor(value: unknown): Target | null {
  if (typeof value !== "string" || value.length > 8192) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    const host = u.hostname;
    let match: RegExpMatchArray | null;
    if (
      ["www.amazon.com.br", "amazon.com.br"].includes(host) &&
      (match = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i))
    ) {
      return {
        store: "amazon",
        id: match[1].toUpperCase(),
        url: `https://www.amazon.com.br/dp/${match[1].toUpperCase()}`,
      };
    }
    if (
      ["www.kabum.com.br", "kabum.com.br"].includes(host) &&
      (match = u.pathname.match(/^\/produto\/(\d+)(?:\/|$)/))
    ) {
      return { store: "kabum", id: match[1], url: `https://${host}${u.pathname}` };
    }
    if (
      ["www.mercadolivre.com.br", "mercadolivre.com.br", "produto.mercadolivre.com.br"].includes(
        host
      ) &&
      (match = u.pathname.match(/\b(MLBU?-?\d+)\b/i))
    ) {
      const query = new URLSearchParams();
      for (const name of ["wid", "pdp_filters", "attributes"])
        if (u.searchParams.has(name)) query.set(name, u.searchParams.get(name)!);
      return {
        store: "mercadolivre",
        id: match[1].replace("-", "").toUpperCase(),
        url: `https://${host}${u.pathname}${query.size ? `?${query}` : ""}`,
      };
    }
    if (
      ["www.shopee.com.br", "shopee.com.br"].includes(host) &&
      (match =
        u.pathname.match(/\/(?:product|opaanlp)\/(\d+)\/(\d+)(?:\/|$)/) ??
        u.pathname.match(/-i\.(\d+)\.(\d+)(?:\/|$)/))
    ) {
      return { store: "shopee", id: match[2], url: `https://${host}${u.pathname}` };
    }
    return null;
  } catch {
    return null;
  }
}
type RecordValue = Record<string, unknown>;
const obj = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};
function products(value: unknown, depth = 0): RecordValue[] {
  if (depth > 8) return [];
  if (Array.isArray(value)) return value.flatMap((item) => products(item, depth + 1));
  const data = obj(value);
  if (
    data["@type"] === "Product" ||
    (Array.isArray(data["@type"]) && data["@type"].includes("Product"))
  )
    return [data];
  return ["@graph", "mainEntity"].flatMap((key) => products(data[key], depth + 1));
}
export function inspectStore(document: Document, target: Target) {
  let title = "",
    identity = false;
  const sections: Record<string, string> = {};
  const clean = (selector: string) =>
    document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  // Fragmentos HTML da ficha técnica são interpretados como texto, nunca exibidos como HTML.
  const fragmentText = (value: unknown) => {
    const element = document.createElement("div");
    element.innerHTML = typeof value === "string" ? value : "";
    element.querySelectorAll("script,style").forEach((node) => node.remove());
    return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
  };
  if (target.store === "amazon") {
    title = clean("#productTitle");
    const details = `${clean("#detailBullets_feature_div")} ${clean("#productDetails_detailBullets_sections1")}`;
    identity = !!title && details.includes(target.id);
    sections.productDescription = clean("#productDescription");
    sections.features = clean("#feature-bullets");
  } else if (target.store === "kabum") {
    try {
      const root = obj(
        JSON.parse(document.querySelector("script#__NEXT_DATA__")?.textContent ?? "null")
      );
      const product = obj(obj(obj(root.props).pageProps).product);
      if (String(product.id) === target.id && typeof product.title === "string") {
        identity = true;
        title = product.title;
        sections.productDescription = fragmentText(product.description);
        sections.technicalInformation = fragmentText(obj(product.technicalInformation).text);
      }
    } catch {
      /* Pode tentar JSON-LD do próprio produto. */
    }
  }
  if (!identity && target.store !== "amazon") {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const matching = products(JSON.parse(script.textContent ?? "null")).filter((product) => {
          const identifiers = [product.sku, product.productID, product["@id"], product.url];
          return identifiers.some(
            (value) =>
              typeof value === "string" &&
              value
                .toUpperCase()
                .replace("MLB-", "MLB")
                .split(/[^A-Z0-9]+/)
                .includes(target.id.toUpperCase())
          );
        });
        if (matching.length !== 1 || typeof matching[0].name !== "string") continue;
        const product = matching[0];
        title = product.name as string;
        identity = true;
        sections.productDescription = fragmentText(product.description);
        const properties = Array.isArray(product.additionalProperty)
          ? product.additionalProperty
          : [product.additionalProperty];
        sections.technicalInformation = properties
          .map((property) => `${obj(property).name ?? ""}: ${obj(property).value ?? ""}`)
          .join(" ");
        break;
      } catch {
        /* Bloco inválido não vira evidência. */
      }
    }
  }
  const patterns: [string, RegExp][] = [
    [
      "digital",
      /\b(?:code in box|codigo para (?:baixar|download)|midia digital|versao digital|sem (?:disco|cartucho)|nao (?:havera|ha|inclui|contem) (?:um )?(?:disco|cartucho)|nao (?:e|inclui|contem) (?:midia|versao|edicao) fisica)\b/,
    ],
    [
      "physical",
      /\b(?:(?:midia|versao|edicao) fisica|disco do jogo|(?:inclui|contem|acompanha) (?:um )?(?:disco|cartucho)|formato\s*:\s*(?:fisico|fisica|disco|cartucho|blu[ -]?ray))\b/,
    ],
    [
      "packaging",
      /\b(?:code in box|codigo (?:para baixar )?(?:dentro da|na) caixa|(?:capa|embalagem|caixa) fisica)\b/,
    ],
  ];
  const evidence: { section: string; signal: string; excerpt: string }[] = [];
  for (const [section, text] of Object.entries(sections))
    for (const [signal, pattern] of patterns) {
      const match = plain(text).match(pattern);
      if (match)
        evidence.push({
          section,
          signal,
          excerpt: text.slice(
            Math.max(0, match.index! - 50),
            Math.min(text.length, match.index! + match[0].length + 160)
          ),
        });
    }
  const has = (signal: string) => evidence.some((item) => item.signal === signal);
  const noPackaging = Object.values(sections).some((text) =>
    /\b(?:sem|nao inclui|nao acompanha) (?:uma )?(?:caixa|capa|embalagem)\b/.test(plain(text))
  );
  let result = "unverified";
  if (identity) {
    if (has("packaging") && noPackaging) result = "unverified";
    else if (has("packaging"))
      result = has("digital") ? "boxed_code_in_store" : "physical_packaging_in_store";
    else if (has("digital") || noPackaging) result = "excluded_digital_without_packaging";
    else if (has("physical")) result = "physical_explicit_in_store";
  }
  return {
    result,
    identity_checked: identity,
    store_title: title || null,
    store: target.store,
    store_checked_url: target.url,
    evidence,
    errors: identity
      ? []
      : ["Dados do produto ausentes ou identidade não confirmada; revisar manualmente."],
    price_verified: false,
    preorder_signal: Object.values(sections).some((text) =>
      /pre[- ]?(?:venda|carregamento)|\breserve\b/.test(plain(text))
    ),
  };
}
