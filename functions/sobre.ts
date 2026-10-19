interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

interface Context {
  request: Request;
  env: Env;
}

const BASE = "https://garimplay.com.br";

const TITLE = "Sobre o Garimplay | Promoções de jogos físicos";

const DESCRIPTION =
  "Conheça o Garimplay, um espaço dedicado à descoberta de promoções de jogos em mídia física para PlayStation, Nintendo e Xbox.";

const CANONICAL = `${BASE}/sobre`;

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const jsonLd = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  try {
    const assetUrl = new URL("/index.html", request.url);

    const assetResponse = await env.ASSETS.fetch(
      new Request(assetUrl, {
        headers: { Accept: "text/html" },
      })
    );

    if (!assetResponse.ok) {
      throw new Error(`HTML asset HTTP ${assetResponse.status}`);
    }

    const template = await assetResponse.text();

    if (!template.includes("</head>") || !template.includes('<div id="root"></div>')) {
      throw new Error("Template HTML inesperado");
    }

    const image = `${BASE}/og-image.png`;

    const tags = [
      `<title data-seo-prerender="true">${esc(TITLE)}</title>`,
      `<meta data-seo-prerender="true" name="description" content="${esc(DESCRIPTION)}">`,
      `<meta data-seo-prerender="true" name="robots" content="index, follow">`,
      `<link data-seo-prerender="true" rel="canonical" href="${esc(CANONICAL)}">`,
      `<meta data-seo-prerender="true" property="og:type" content="website">`,
      `<meta data-seo-prerender="true" property="og:url" content="${esc(CANONICAL)}">`,
      `<meta data-seo-prerender="true" property="og:title" content="${esc(TITLE)}">`,
      `<meta data-seo-prerender="true" property="og:description" content="${esc(DESCRIPTION)}">`,
      `<meta data-seo-prerender="true" property="og:image" content="${esc(image)}">`,
      `<meta data-seo-prerender="true" property="og:locale" content="pt_BR">`,
      `<meta data-seo-prerender="true" property="og:site_name" content="Garimplay">`,
      `<meta data-seo-prerender="true" name="twitter:card" content="summary_large_image">`,
      `<meta data-seo-prerender="true" name="twitter:title" content="${esc(TITLE)}">`,
      `<meta data-seo-prerender="true" name="twitter:description" content="${esc(DESCRIPTION)}">`,
      `<meta data-seo-prerender="true" name="twitter:image" content="${esc(image)}">`,
    ];

    const aboutPage = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: TITLE,
      description: DESCRIPTION,
      url: CANONICAL,
      inLanguage: "pt-BR",
      isPartOf: {
        "@type": "WebSite",
        name: "Garimplay",
        url: BASE,
      },
    };

    tags.push(`<script type="application/ld+json">${jsonLd(aboutPage)}</script>`);

    const visible = `
      <section
        id="seo-prerender"
        aria-label="Sobre o Garimplay"
        style="max-width:900px;margin:3rem auto;padding:1rem;font-family:system-ui,sans-serif"
      >
        <h1>Bons jogos merecem bons achados.</h1>

        <p>
          O Garimplay nasceu para facilitar a descoberta de
          promoções de jogos em mídia física. Reunimos ofertas
          em um só lugar para ajudar você a encontrar bons
          preços e aumentar sua coleção.
        </p>

        <h2>Como funciona?</h2>

        <ol>
          <li>
            <strong>Encontre:</strong>
            explore ofertas de jogos em mídia física para diferentes plataformas.
          </li>
          <li>
            <strong>Confira:</strong>
            veja preços, cupons e condições disponíveis antes de aproveitar uma oferta.
          </li>
          <li>
            <strong>Aproveite:</strong>
            acesse a loja responsável para conferir os detalhes
            e finalizar sua compra.
          </li>
        </ol>

        <h2>Feito para quem gosta de mídia física</h2>

        <p>
          Seja para adicionar um clássico à coleção, encontrar
          aquele jogo que faltava ou acompanhar uma pré-venda,
          queremos tornar a busca por oportunidades mais prática.
        </p>

        <p>
          Nosso foco está nos jogos físicos, reunindo ofertas
          para diferentes consoles e gerações.
        </p>

        <h2>Transparência em primeiro lugar</h2>

        <p>
          O Garimplay é uma plataforma de divulgação de ofertas.
          Não realizamos a venda dos produtos diretamente.
        </p>

        <p>
          Ao escolher uma promoção, você é direcionado para a loja
          responsável, onde poderá consultar as condições e finalizar sua compra.
        </p>

        <p>
          Preços, disponibilidade, cupons e condições de pagamento
          podem mudar sem aviso prévio. Por isso, recomendamos
          conferir todas as informações na loja antes de comprar.
        </p>

        <p>
          <a href="/">Explorar ofertas no Garimplay</a>
        </p>
      </section>
    `;

    // Remove os metadados padrão do index.html.
    const cleaned = template
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\b(?=[^>]*\bdata-seo-default\s*=\s*["']true["'])[^>]*\/?>/gi, "");

    const html = cleaned
      .replace("</head>", `${tags.join("\n")}\n</head>`)
      .replace('<div id="root"></div>', `${visible}\n<div id="root"></div>`);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Falha na renderização SEO da página Sobre", error);

    return new Response("Serviço temporariamente indisponível", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
