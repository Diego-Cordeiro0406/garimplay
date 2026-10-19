interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

interface SitemapDeal {
  id: string;
  updated_at: string | null;
  expires_at: string | null;
}

interface PagesContext {
  env: Env;
}

const BASE_URL = "https://garimplay.com.br";
const PAGE_SIZE = 1000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createUrlEntry(path: string, lastModified?: string | null): string {
  const location = escapeXml(`${BASE_URL}${path}`);

  const lastmod = lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : "";

  return `
  <url>
    <loc>${location}</loc>
    ${lastmod}
  </url>`;
}

async function getPublishedDeals(env: Env): Promise<SitemapDeal[]> {
  const deals: SitemapDeal[] = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/deals`);

    url.searchParams.set("select", "id,updated_at,expires_at");
    url.searchParams.set("status", "eq.published");
    url.searchParams.set("or", `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`);
    url.searchParams.set("order", "id.asc");
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString(), {
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao consultar ofertas: ${response.status}`);
    }

    const batch = (await response.json()) as SitemapDeal[];

    deals.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return deals;
}

export async function onRequestGet({ env }: PagesContext): Promise<Response> {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Configuração do Supabase ausente.");
    }

    const deals = await getPublishedDeals(env);

    const urls = [
      // Páginas estáticas
      createUrlEntry("/"),
      createUrlEntry("/sobre"),

      // Páginas de ofertas
      ...deals.map((deal) =>
        createUrlEntry(`/ofertas/${encodeURIComponent(deal.id)}`, deal.updated_at)
      ),
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar sitemap:", error);

    return new Response("Erro ao gerar sitemap.", {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
