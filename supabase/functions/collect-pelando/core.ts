import { CollectionFailure, safeFailure, shapeOf } from "./diagnostics.ts";
export const QUERIES = ["jogo PS5", "jogo PS4", "jogo Switch", "jogo Xbox", "mídia física"];
export type Data = Record<string, unknown>;
export type Cursor = { after: string; scan_started_at: string };
export type CursorMap = Record<string, Cursor>;
export const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const object = (v: unknown): Data => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new CollectionFailure({
      kind: "schema",
      stage: "expected_object",
      ...shapeOf(v),
    });
  return v as Data;
};
export function isoTime(value: unknown): number {
  return typeof value === "string" && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ? Date.parse(value)
    : NaN;
}
const https = (v: unknown) => {
  try {
    if (typeof v !== "string" || v.length > 8192 || /\s/.test(v)) return null;
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password && !u.port ? v : null;
  } catch {
    return null;
  }
};
const PLATFORMS: [string, RegExp][] = [
  ["ps5", /\b(?:ps5|playstation\s*5)\b/],
  ["ps4", /\b(?:ps4|playstation\s*4)\b/],
  ["switch-2", /\b(?:nintendo\s+)?switch\s*2\b/],
  ["switch", /\b(?:nintendo\s+switch|switch\s+(?:oled|lite))\b/],
  ["xbox-series", /\bxbox\s+series\b/],
  ["xbox-one", /\bxbox\s+one\b/],
];
export function normalize(raw: Data, now: Date): Data | null {
  const approved = isoTime(raw.firstApprovedAt);
  if (
    raw.status !== "active" ||
    !Number.isFinite(approved) ||
    approved < +now - 86400_000 ||
    approved > +now
  )
    return null;
  if (
    typeof raw.id !== "string" ||
    !raw.id ||
    raw.id.length > 200 ||
    typeof raw.title !== "string" ||
    raw.title.trim().length < 3 ||
    raw.title.length > 200 ||
    typeof raw.slug !== "string" ||
    !/^[a-zA-Z0-9-]+$/.test(raw.slug)
  )
    return null;
  const title = plain(raw.title);
  if (raw.kind !== "promotion" || /\b(?:cupom|cupons)\b/.test(title)) return null;
  const boxed =
    /\b(?:code in box|codigo na caixa|codigo dentro da caixa|capa fisica|embalagem fisica|caixa fisica)\b/.test(
      title
    );
  // Não confunde "capa física" com capa avulsa; bundles de console continuam excluídos.
  const hardwareTitle = boxed ? title.replace(/\bcapa fisica\b/g, "") : title;
  if (
    /\b(?:bundle|console|consoles|controle|controles|dualsense|dualshock|headset|suporte|capa|pelicula|carregador|volante|amiibo|case|estojo|fone|dock|cartao de memoria)\b/.test(
      hardwareTitle
    ) ||
    /^(?:\[[^\]]+\]\s*)?(?:sony\s+|nintendo\s+)?(?:playstation\s*5|ps5|playstation\s*4|ps4|xbox\s+series|switch\s*(?:2|oled|lite))\s+\d+\s*(?:gb|tb)\b/.test(
      title
    )
  )
    return null;
  let platforms = PLATFORMS.filter(([, regex]) => regex.test(title)).map(([id]) => id);
  if (platforms.includes("switch-2")) platforms = platforms.filter((id) => id !== "switch");
  if (!platforms.length && !/\b(?:jogos?|games?)\b/.test(title)) return null;
  const product = https(raw.sourceUrl);
  const digitalHost =
    product &&
    [
      "store.steampowered.com",
      "store.epicgames.com",
      "play.google.com",
      "apps.apple.com",
      "luna.amazon.com",
    ].includes(new URL(product).hostname);
  const physical =
    /\b(?:midia fisica|versao fisica|edicao fisica|disco|cartucho|physical|blu[ -]?ray)\b/.test(
      title
    );
  const digital =
    digitalHost ||
    /\b(?:digital|digitais|download|key|chave|codigo|gift\s*card|steam|epic|android|ios|prime gaming|game\s*pass|assinatura|dlc|trial|teste gratis|teste gratuito|conta primaria|conta secundaria|resgate)\b/.test(
      title
    );
  // Conteúdo digital puro nunca passa apenas pela presença de uma plataforma.
  if (digitalHost || (digital && !boxed)) return null;
  if (!physical && !boxed && !(platforms.length && product && new URL(product).pathname !== "/"))
    return null;
  let price: number | null = null;
  if (raw.price !== null && raw.price !== undefined) {
    if (
      (typeof raw.price !== "number" && typeof raw.price !== "string") ||
      !/^\d+(?:\.\d{1,2})?$/.test(String(raw.price))
    )
      return null;
    const [whole, fraction = ""] = String(raw.price).split(".");
    price = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    if (!Number.isSafeInteger(price) || price > 2147483647) return null;
  }
  const store = raw.store && typeof raw.store === "object" ? (raw.store as Data) : {};
  return {
    source: "pelando",
    external_id: raw.id,
    title: raw.title.trim(),
    price_cents: price,
    currency: "BRL",
    source_url: `https://www.pelando.com.br/d/${raw.slug}`,
    product_url: product,
    image_url: https(raw.imageUrl),
    store: typeof store.name === "string" ? { name: store.name, id: store.id ?? null } : null,
    source_status: "active",
    kind: "promotion",
    approved_at: raw.firstApprovedAt,
    platform_suggestions: platforms,
    physical_media: physical && !boxed ? "physical_confirmed" : "physical_likely",
    physical_media_reasons: [
      boxed
        ? "Embalagem física indicada; código em caixa é aceito."
        : "Indicação no título/link; confirmar na loja.",
    ],
    collected_at: now.toISOString(),
    found_by_queries: [],
  };
}
export type GetPage = (params: URLSearchParams, timeoutMs: number) => Promise<unknown>;
export async function collect(
  getPage: GetPage,
  previous: CursorMap,
  now = new Date(),
  deadlineMs = 40_000
) {
  const deadline = Date.now() + deadlineMs;
  const candidates = new Map<string, { raw: Data; terms: Set<string> }>();
  const cursors: CursorMap = { ...previous };
  const searches: Data[] = [];
  let pages = 0,
    rows = 0,
    failed = 0,
    nextJob = 0;
  async function worker() {
    while (nextJob < QUERIES.length) {
      const query = QUERIES[nextJob++];
      let first = true,
        after: string | undefined;
      let succeeded = 0,
        hasMore = false;
      const old = previous[query];
      const validOld =
        old &&
        typeof old.after === "string" &&
        +now - Date.parse(old.scan_started_at) < 6 * 3600_000 &&
        +now >= Date.parse(old.scan_started_at);
      try {
        for (let index = 0; index < 2; index++) {
          const remaining = deadline - Date.now();
          if (remaining < 250)
            throw new CollectionFailure({
              kind: "budget",
              stage: "before_request",
            });
          const params = new URLSearchParams({
            term: query,
            sortOption: "createdAt",
            hideExpired: "true",
            limit: "20",
          });
          if (after) params.set("after", after);
          const response = object(await getPage(params, Math.min(6000, remaining)));
          if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
            throw new CollectionFailure({
              kind: "schema",
              stage: "data",
              ...shapeOf(response),
            });
          }
          const data = object(response.data);
          if (!data.pageInfo || typeof data.pageInfo !== "object" || Array.isArray(data.pageInfo)) {
            throw new CollectionFailure({
              kind: "schema",
              stage: "page_info",
              ...shapeOf(response),
            });
          }
          const info = object(data.pageInfo);
          if (
            !Array.isArray(data.deals) ||
            typeof info.hasNextPage !== "boolean" ||
            data.deals.length > 20
          )
            throw new CollectionFailure({
              kind: "schema",
              stage: "deals_or_pagination",
              ...shapeOf(response),
            });
          pages++;
          succeeded++;
          rows += data.deals.length;
          for (const value of data.deals) {
            let raw: Data;
            try {
              raw = object(value);
            } catch {
              continue;
            }
            if (typeof raw.id !== "string") continue;
            const known = candidates.get(raw.id);
            if (!known) candidates.set(raw.id, { raw, terms: new Set([query]) });
            else {
              known.terms.add(query);
              if ((isoTime(raw.updatedAt) || 0) > (isoTime(known.raw.updatedAt) || 0))
                known.raw = raw;
            }
          }
          hasMore = info.hasNextPage;
          if (!hasMore) {
            delete cursors[query];
            break;
          }
          if (typeof info.endCursor !== "string" || !info.endCursor || info.endCursor === after)
            throw new CollectionFailure({ kind: "cursor", stage: "next_page" });
          const next = first && validOld ? old.after : info.endCursor;
          cursors[query] = {
            after: next,
            scan_started_at: validOld ? old.scan_started_at : now.toISOString(),
          };
          // A primeira página é sempre relida para capturar novas publicações; a segunda avança a cauda.
          after = next;
          first = false;
          if (index === 1)
            cursors[query] = {
              after: info.endCursor,
              scan_started_at: cursors[query].scan_started_at,
            };
        }
        searches.push({ query, pages: succeeded, has_more: hasMore });
      } catch (error) {
        failed++;
        const diagnostic = safeFailure(error, "collect");
        searches.push({
          query,
          pages: succeeded,
          has_more: true,
          error: diagnostic.kind,
          diagnostic,
        });
      }
    }
  }
  await Promise.all([worker(), worker()]);
  const offers: Data[] = [];
  for (const { raw, terms } of candidates.values()) {
    const offer = normalize(raw, now);
    if (offer) {
      offer.found_by_queries = [...terms].sort();
      offers.push(offer);
    }
  }
  return {
    offers,
    cursors,
    summary: {
      outcome: failed === QUERIES.length && pages === 0 ? "failed" : failed ? "partial" : "success",
      pages,
      rows_received: rows,
      unique_ids: candidates.size,
      candidates: offers.length,
      failed_searches: failed,
      searches,
      duration_ms: Math.max(0, Date.now() - (deadline - deadlineMs)),
    },
  };
}
