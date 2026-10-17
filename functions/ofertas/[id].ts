interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}
interface Context {
  request: Request;
  env: Env;
  params: { id: string };
}
interface Deal {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  original_price_cents: number | null;
  deal_url: string;
  status: "published" | "expired";
  expires_at: string | null;
  pre_order: boolean;
  store: { name: string };
  platform: { name: string };
}
const BASE = "https://garimplay.com.br";
const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const jsonLd = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export async function onRequestGet({ request, env, params }: Context): Promise<Response> {
  const id = params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Oferta não encontrada", { status: 404 });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return new Response("Serviço temporariamente indisponível", { status: 503 });
  }
  try {
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/deals`);
    url.searchParams.set(
      "select",
      "id,title,description,image_url,price_cents,original_price_cents,deal_url,status,expires_at,pre_order,store:stores!deals_store_id_fkey(name),platform:platforms!deals_platform_id_fkey(name)"
    );
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("status", "in.(published,expired)");
    url.searchParams.set("limit", "1");
    const result = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!result.ok) throw new Error(`Supabase HTTP ${result.status}`);
    const [deal] = (await result.json()) as Deal[];
    if (!deal) return new Response("Oferta não encontrada", { status: 404 });

    const assetUrl = new URL("/index.html", request.url);
    const assetResponse = await env.ASSETS.fetch(
      new Request(assetUrl, { headers: { Accept: "text/html" } })
    );
    if (!assetResponse.ok) throw new Error(`HTML asset HTTP ${assetResponse.status}`);
    const template = await assetResponse.text();
    if (!template.includes("</head>") || !template.includes('<div id="root"></div>'))
      throw new Error("Template HTML inesperado");

    const expired =
      deal.status === "expired" ||
      Boolean(deal.expires_at && Date.parse(deal.expires_at) <= Date.now());
    const canonical = `${BASE}/ofertas/${encodeURIComponent(deal.id)}`;
    const title = expired
      ? `${deal.title} | Oferta expirada | Garimplay`
      : `${deal.title} por ${money(deal.price_cents)} | Garimplay`;
    const description = expired
      ? `Esta oferta de ${deal.title} na ${deal.store.name} expirou. Confira outras promoções de jogos físicos no Garimplay.`
      : `Confira a oferta de ${deal.title} por ${money(deal.price_cents)} na ${deal.store.name}. Veja as condições e a disponibilidade no Garimplay.`;
    const image = deal.image_url ? new URL(deal.image_url, BASE).href : `${BASE}/og-image.png`;
    const tags = [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(description)}">`,
      `<meta name="robots" content="${expired ? "noindex, follow" : "index, follow"}">`,
      `<link rel="canonical" href="${esc(canonical)}">`,
      `<meta property="og:type" content="product">`,
      `<meta property="og:url" content="${esc(canonical)}">`,
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(description)}">`,
      `<meta property="og:image" content="${esc(image)}">`,
      `<meta property="og:locale" content="pt_BR">`,
      `<meta property="og:site_name" content="Garimplay">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${esc(title)}">`,
      `<meta name="twitter:description" content="${esc(description)}">`,
      `<meta name="twitter:image" content="${esc(image)}">`,
    ];
    if (!expired) {
      const product = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: deal.title,
        ...(deal.description ? { description: deal.description } : {}),
        ...(deal.image_url ? { image: image } : {}),
        offers: {
          "@type": "Offer",
          price: (deal.price_cents / 100).toFixed(2),
          priceCurrency: "BRL",
          url: deal.deal_url,
          seller: { "@type": "Organization", name: deal.store.name },
          ...(deal.pre_order ? { availability: "https://schema.org/PreOrder" } : {}),
        },
      };
      tags.push(`<script type="application/ld+json">${jsonLd(product)}</script>`);
    }
    const visible = `<section id="seo-prerender" aria-label="Detalhes da oferta" style="max-width:1100px;margin:3rem auto;padding:1rem;font-family:system-ui,sans-serif"><h1>${esc(deal.title)}</h1>${deal.image_url ? `<img src="${esc(image)}" alt="${esc(deal.title)}" width="280" style="max-width:100%;height:auto">` : ""}<p><strong>${esc(money(deal.price_cents))}</strong></p><p>${esc(deal.store.name)} · ${esc(deal.platform.name)}</p>${deal.pre_order ? "<p>Pré-venda</p>" : ""}${expired ? "<p>Oferta expirada</p>" : ""}${deal.description ? `<p>${esc(deal.description)}</p>` : ""}${!expired ? `<p><a href="${esc(deal.deal_url)}" rel="nofollow sponsored noopener noreferrer">Ver oferta na loja</a></p>` : ""}</section>`;
    // Remove metadados padrão do index.html para não gerar títulos e descriptions duplicados.
    const cleaned = template
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+name=["']description["'][^>]*>/i, "");
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
    console.error("Falha na renderização SEO da oferta", error);
    return new Response("Serviço temporariamente indisponível", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
