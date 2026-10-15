import { createClient } from "npm:@supabase/supabase-js@2";
import { DOMParser } from "npm:linkedom@0.18.13";
import { extractAmazonMetadata } from "./amazon.ts";

type Store = "amazon" | "mercadolivre" | "kabum" | "shopee";

type ExtractedProduct = {
  url: string;
  store: Store;
  title: string | null;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  platform: string | null;
  warnings: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_HTML_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

const STORE_HOSTS: Record<Store, string[]> = {
  amazon: ["amazon.com.br", "www.amazon.com.br"],
  mercadolivre: ["mercadolivre.com.br", "www.mercadolivre.com.br", "produto.mercadolivre.com.br"],
  kabum: ["kabum.com.br", "www.kabum.com.br"],
  shopee: ["shopee.com.br", "www.shopee.com.br"],
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getStore(url: URL): Store | null {
  for (const [store, hosts] of Object.entries(STORE_HOSTS)) {
    if (hosts.includes(url.hostname.toLowerCase())) {
      return store as Store;
    }
  }

  return null;
}

function validateUrl(value: string): {
  url: URL;
  store: Store;
} {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("URL inválida.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    value.length > 2048
  ) {
    throw new Error("Informe uma URL HTTPS válida.");
  }

  const store = getStore(url);

  if (!store) {
    throw new Error("Esta loja ainda não é suportada.");
  }

  return { url, store };
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const result = value.replace(/\s+/g, " ").trim();
  return result || null;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string") return null;

  const raw = value.trim().replace(/[^\d,.-]/g, "");
  if (!raw) return null;

  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");

  let normalized = raw;

  if (comma > dot) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (dot > comma && comma !== -1) {
    normalized = raw.replace(/,/g, "");
  } else if (comma !== -1) {
    normalized = raw.replace(",", ".");
  }

  const price = Number(normalized);

  return Number.isFinite(price) && price > 0 ? price : null;
}

function absoluteImage(value: unknown, baseUrl: string): string | null {
  const candidate = clean(value);

  if (!candidate) return null;

  try {
    const image = new URL(candidate, baseUrl);

    if (image.protocol !== "https:" && image.protocol !== "http:") {
      return null;
    }

    return image.toString();
  } catch {
    return null;
  }
}

function getJsonLdProduct(document: Document) {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  const findProduct = (value: unknown, depth = 0): Record<string, unknown> | null => {
    if (depth > 8 || !value || typeof value !== "object") {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findProduct(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    const object = value as Record<string, unknown>;
    const type = object["@type"];

    const types = Array.isArray(type) ? type : [type];

    if (types.some((item) => typeof item === "string" && /(^|[/#])Product$/i.test(item))) {
      return object;
    }

    for (const key of ["@graph", "mainEntity", "itemListElement"]) {
      const found = findProduct(object[key], depth + 1);
      if (found) return found;
    }

    return null;
  };

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || "");
      const product = findProduct(parsed);

      if (product) return product;
    } catch {
      // Ignora JSON-LD inválido.
    }
  }

  return null;
}

function getImageValue(value: unknown): string | null {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = getImageValue(item);
      if (image) return image;
    }
  }

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;

    return getImageValue(object.url) ?? getImageValue(object.contentUrl);
  }

  return null;
}

function extractPlatform(title: string | null): string | null {
  if (!title) return null;

  if (/\b(playstation 5|ps5)\b/i.test(title)) return "PS5";
  if (/\b(playstation 4|ps4)\b/i.test(title)) return "PS4";
  if (/\bnintendo switch 2\b/i.test(title)) return "Nintendo Switch 2";
  if (/\bnintendo switch\b/i.test(title)) return "Nintendo Switch";
  if (/\bxbox series (x|s|x\|s)\b/i.test(title)) return "Xbox Series X|S";
  if (/\bxbox one\b/i.test(title)) return "Xbox One";

  return null;
}

function extractMetadata(html: string, productUrl: string, store: Store): ExtractedProduct {
  const document = new DOMParser().parseFromString(html, "text/html") as Document;
  const amazon = store === "amazon" ? extractAmazonMetadata(document) : null;

  const meta = (key: string): string | null => {
    const elements = document.querySelectorAll("meta");

    for (const element of elements) {
      const name = element.getAttribute("property") ?? element.getAttribute("name");

      if (name?.toLowerCase() === key.toLowerCase()) {
        return clean(element.getAttribute("content"));
      }
    }

    return null;
  };

  const product = getJsonLdProduct(document);

  const offersValue = product?.offers;
  const offers = Array.isArray(offersValue) ? offersValue[0] : offersValue;

  const offer = offers && typeof offers === "object" ? (offers as Record<string, unknown>) : null;

  const currency = clean(offer?.priceCurrency) ?? meta("product:price:currency");

  const rawTitle =
    amazon?.title ??
    clean(product?.name) ??
    meta("og:title") ??
    clean(document.querySelector("title")?.textContent);

  const title =
    store === "amazon"
      ? (rawTitle?.replace(/\s*:\s*Amazon\.com\.br\s*:\s*.*$/i, "") ?? null)
      : rawTitle;

  const imageUrl = absoluteImage(
    amazon?.imageUrl ?? getImageValue(product?.image) ?? meta("og:image") ?? meta("twitter:image"),
    productUrl
  );

  // Não aceita preços em moeda diferente de BRL.
  const structuredPrice =
    currency?.toUpperCase() === "BRL"
      ? parsePrice(offer?.price ?? meta("product:price:amount"))
      : null;

  const price = structuredPrice ?? amazon?.price ?? null;

  const originalPrice = amazon?.originalPrice ?? null;

  const warnings: string[] = [];

  if (!title) {
    warnings.push("Título não encontrado.");
  }

  if (!imageUrl) {
    warnings.push("Imagem não encontrada.");
  }

  if (price === null) {
    warnings.push("Preço não encontrado ou moeda não confirmada. Informe manualmente.");
  }

  if (store === "amazon" && price !== null) {
    warnings.push(
      "Preço extraído automaticamente. Confira o valor, vendedor e condições de pagamento antes de publicar."
    );
  }

  if (store === "amazon" && originalPrice !== null) {
    warnings.push(
      "Preço original identificado automaticamente. Confirme se corresponde ao mesmo produto e oferta."
    );
  }

  return {
    url: productUrl,
    store,
    title,
    imageUrl,
    price,
    originalPrice: amazon?.originalPrice ?? null,
    platform: extractPlatform(title),
    warnings,
  };
}

async function fetchHtml(initialUrl: URL): Promise<{
  html: string;
  finalUrl: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let currentUrl = initialUrl;

    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();

        if (redirect === MAX_REDIRECTS) {
          throw new Error("Limite de redirecionamentos excedido.");
        }

        const location = response.headers.get("location");

        if (!location) {
          throw new Error("Redirecionamento inválido.");
        }

        const nextUrl = new URL(location, currentUrl);

        // Valida novamente o destino de cada redirecionamento.
        validateUrl(nextUrl.toString());
        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();

        throw new Error(`A loja não permitiu a consulta (HTTP ${response.status}).`);
      }

      const contentType = response.headers.get("content-type") ?? "";

      console.log("[EXTRACT] Resposta HTTP:", {
        host: currentUrl.hostname,
        status: response.status,
        contentType: contentType || "(ausente)",
        contentLength: response.headers.get("content-length"),
        contentEncoding: response.headers.get("content-encoding"),
        redirected: redirect > 0,
      });

      const hasContentType = contentType.trim().length > 0;

      const isHtmlContentType = /^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(
        contentType.trim()
      );

      // Rejeita tipos explicitamente incompatíveis.
      // Quando o Content-Type estiver ausente, valida o corpo posteriormente.
      if (hasContentType && !isHtmlContentType) {
        await response.body?.cancel();

        throw new Error(`A loja retornou um formato incompatível: ${contentType}`);
      }

      const declaredLength = Number(response.headers.get("content-length") ?? 0);

      if (declaredLength > MAX_HTML_BYTES) {
        await response.body?.cancel();
        throw new Error("Página maior que o limite permitido.");
      }

      if (!response.body) {
        throw new Error("Resposta vazia.");
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          total += value.byteLength;

          if (total > MAX_HTML_BYTES) {
            throw new Error("Página maior que o limite permitido.");
          }

          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }

      const bytes = new Uint8Array(total);
      let offset = 0;

      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }

      const html = new TextDecoder("utf-8").decode(bytes);

      const htmlStart = html
        .replace(/^\uFEFF/, "")
        .trimStart()
        .slice(0, 2048);

      const looksLikeHtml =
        /^<!doctype\s+html\b/i.test(htmlStart) ||
        /^<html(?:\s|>)/i.test(htmlStart) ||
        /^<head(?:\s|>)/i.test(htmlStart) ||
        /^<body(?:\s|>)/i.test(htmlStart);

      console.log("[EXTRACT] Diagnóstico do conteúdo:", {
        host: currentUrl.hostname,
        contentType: contentType || "(ausente)",
        htmlLength: html.length,
        looksLikeHtml,
        hasProductTitle: html.includes('id="productTitle"'),
        hasJsonLd: html.includes("application/ld+json"),
        hasAmazonCaptcha: /validateCaptcha|Enter the characters you see below/i.test(html),
      });

      if (!looksLikeHtml) {
        throw new Error("A loja não retornou um documento HTML reconhecível.");
      }

      return {
        html,
        finalUrl: currentUrl.toString(),
      };
    }

    throw new Error("Não foi possível acessar o produto.");
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autenticado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!);

    const supabaseKey = Object.values(publishableKeys)[0] as string;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Configuração do Supabase ausente.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const token = authHeader.slice(7);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    // Usa a função is_admin() já existente no Garimplay.
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");

    if (roleError || isAdmin !== true) {
      return json({ error: "Acesso não autorizado." }, 403);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return json({ error: "JSON inválido." }, 400);
    }

    if (!body || typeof body !== "object" || typeof (body as { url?: unknown }).url !== "string") {
      return json({ error: "Informe a URL do produto." }, 400);
    }

    const inputUrl = (body as { url: string }).url;
    let validated: ReturnType<typeof validateUrl>;

    try {
      validated = validateUrl(inputUrl);
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "URL inválida.",
        },
        400
      );
    }

    try {
      const { html, finalUrl } = await fetchHtml(validated.url);

      const finalStore = getStore(new URL(finalUrl));

      if (!finalStore || finalStore !== validated.store) {
        return json({ error: "Redirecionamento para loja diferente." }, 422);
      }

      const result = extractMetadata(html, inputUrl, validated.store);

      if (!result.title && !result.imageUrl && result.price === null) {
        return json(
          {
            error:
              "Não foram encontrados metadados úteis. A loja pode estar bloqueando consultas automatizadas.",
          },
          422
        );
      }

      return json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao consultar a loja.";

      if (error instanceof Error && error.name === "AbortError") {
        return json({ error: "A loja demorou demais para responder." }, 504);
      }

      return json({ error: message }, 422);
    }
  } catch (error) {
    console.error("[extract-product-metadata]", error);

    return json({ error: "Erro interno ao extrair os dados." }, 500);
  }
});
