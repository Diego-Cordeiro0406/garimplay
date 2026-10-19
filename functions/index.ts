interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface Context {
  request: Request;
  env: Env;
}

interface HomeDeal {
  id: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  expires_at: string | null;
  pre_order: boolean;
  store: { name: string } | null;
}

const BASE = "https://garimplay.com.br";
const TITLE = "Promoções de jogos em mídia física | Garimplay";
const DESCRIPTION =
  "Encontre ofertas de jogos físicos para PlayStation, Nintendo e Xbox. Garimpe bons preços para aumentar sua coleção.";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return new Response("Serviço temporariamente indisponível", { status: 503 });
  }

  try {
    const query = new URL(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/deals`);
    query.searchParams.set(
      "select",
      "id,title,price_cents,image_url,expires_at,pre_order,store:stores!deals_store_id_fkey(name)"
    );
    query.searchParams.set("status", "eq.published");
    query.searchParams.set("order", "created_at.desc");
    query.searchParams.set("limit", "30");

    const [dealsResponse, assetResponse] = await Promise.all([
      fetch(query, {
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(7000),
      }),
      env.ASSETS.fetch(
        new Request(new URL("/index.html", request.url), {
          headers: { Accept: "text/html" },
        })
      ),
    ]);

    if (!dealsResponse.ok || !assetResponse.ok) {
      throw new Error(
        `Falha ao carregar Home: deals=${dealsResponse.status}, html=${assetResponse.status}`
      );
    }

    const deals = (await dealsResponse.json()) as HomeDeal[];
    const now = Date.now();
    const active = deals
      .filter((deal) => {
        if (!deal.expires_at) return true;
        const expires = Date.parse(deal.expires_at);
        return !Number.isFinite(expires) || expires > now;
      })
      .slice(0, 10);

    const template = await assetResponse.text();
    if (!template.includes("</head>") || !template.includes('<div id="root"></div>')) {
      throw new Error("Template HTML inesperado");
    }

    const tags = [
      `<title data-seo-prerender="true">${esc(TITLE)}</title>`,
      `<meta data-seo-prerender="true" name="description" content="${esc(DESCRIPTION)}">`,
      `<meta data-seo-prerender="true" name="robots" content="index, follow">`,
      `<link data-seo-prerender="true" rel="canonical" href="${BASE}/">`,
      `<meta data-seo-prerender="true" property="og:type" content="website">`,
      `<meta data-seo-prerender="true" property="og:url" content="${BASE}/">`,
      `<meta data-seo-prerender="true" property="og:title" content="${esc(TITLE)}">`,
      `<meta data-seo-prerender="true" property="og:description" content="${esc(DESCRIPTION)}">`,
      `<meta data-seo-prerender="true" property="og:image" content="${BASE}/og-image.png">`,
      `<meta data-seo-prerender="true" property="og:locale" content="pt_BR">`,
      `<meta data-seo-prerender="true" property="og:site_name" content="Garimplay">`,
      `<meta data-seo-prerender="true" name="twitter:card" content="summary_large_image">`,
      `<meta data-seo-prerender="true" name="twitter:title" content="${esc(TITLE)}">`,
      `<meta data-seo-prerender="true" name="twitter:description" content="${esc(DESCRIPTION)}">`,
      `<meta data-seo-prerender="true" name="twitter:image" content="${BASE}/og-image.png">`,
    ];

    if (active.length) {
      const itemList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Ofertas recentes de jogos físicos no Garimplay",
        numberOfItems: active.length,
        itemListElement: active.map((deal, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${BASE}/ofertas/${encodeURIComponent(deal.id)}`,
          name: deal.title,
        })),
      };
      tags.push(`<script type="application/ld+json">${safeJson(itemList)}</script>`);
    }

    const cards = active
      .map((deal) => {
        const url = `/ofertas/${encodeURIComponent(deal.id)}`;
        const img = deal.image_url
          ? `<img src="${esc(deal.image_url)}" alt="${esc(deal.title)}" width="120" height="120" loading="lazy">`
          : "";
        return `<li><a href="${esc(url)}">${img}<span>${esc(deal.title)}</span></a> — <strong>${esc(money(deal.price_cents))}</strong>${deal.pre_order ? " — Pré-venda" : ""}${deal.store?.name ? ` — ${esc(deal.store.name)}` : ""}</li>`;
      })
      .join("\n");

    const visible = `<section id="seo-prerender" aria-label="Ofertas recentes de jogos físicos" style="max-width:1100px;margin:3rem auto;padding:1rem;font-family:system-ui,sans-serif"><h1>Promoções de jogos em mídia física</h1><p>${esc(DESCRIPTION)}</p>${cards ? `<h2>Ofertas recentes</h2><ul>${cards}</ul>` : ""}</section>`;

    const cleaned = template
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/gi, "");
    const html = cleaned
      .replace("</head>", `${tags.join("\n")}\n</head>`)
      .replace('<div id="root"></div>', `${visible}\n<div id="root"></div>`);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Falha na pré-renderização da Home", error);
    return new Response("Serviço temporariamente indisponível", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
