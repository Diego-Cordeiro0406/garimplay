export async function sameSecret(actual: string, expected: string): Promise<boolean> {
  const hash = async (s: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([hash(actual), hash(expected)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as Record<string, unknown>;
}
function https(value: unknown, nullable = false): void {
  if (nullable && (value === null || value === undefined || value === "")) return;
  if (typeof value !== "string" || value.length > 8192 || /\s/.test(value))
    throw new Error("Invalid URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error("Invalid URL");
}
export function parseBatch(input: unknown): Record<string, unknown>[] {
  const body = object(input);
  if (!Array.isArray(body.offers) || body.offers.length < 1 || body.offers.length > 50)
    throw new Error("Invalid batch");
  const ids = new Set<string>();
  return body.offers.map((value) => {
    const offer = object(value);
    if (
      offer.source !== "pelando" ||
      typeof offer.external_id !== "string" ||
      !offer.external_id.trim() ||
      offer.external_id.length > 200 ||
      ids.has(offer.external_id)
    )
      throw new Error("Invalid identity");
    ids.add(offer.external_id);
    if (
      typeof offer.title !== "string" ||
      offer.title.trim().length < 3 ||
      offer.title.length > 200
    )
      throw new Error("Invalid title");
    if (
      offer.currency !== "BRL" ||
      (offer.price_cents !== null &&
        (!Number.isInteger(offer.price_cents) ||
          Number(offer.price_cents) < 0 ||
          Number(offer.price_cents) > 2147483647))
    )
      throw new Error("Invalid price");
    if (
      typeof offer.collected_at !== "string" ||
      !/(?:Z|[+-]\d{2}:\d{2})$/.test(offer.collected_at) ||
      !Number.isFinite(Date.parse(offer.collected_at)) ||
      Date.parse(offer.collected_at) > Date.now() + 300_000
    )
      throw new Error("Invalid time");
    if (offer.source_status !== "active") throw new Error("Expected active offer");
    https(offer.source_url);
    if (new URL(String(offer.source_url)).hostname !== "www.pelando.com.br")
      throw new Error("Invalid source URL");
    https(offer.product_url, true);
    https(offer.image_url, true);
    if (offer.verification !== undefined) {
      const verification = object(offer.verification);
      if (
        typeof verification.checked_at !== "string" ||
        !/(?:Z|[+-]\d{2}:\d{2})$/.test(verification.checked_at) ||
        !Number.isFinite(Date.parse(verification.checked_at)) ||
        Date.parse(verification.checked_at) > Date.now() + 300_000
      )
        throw new Error("Invalid verification time");
    }
    // Preserva dados recebidos como texto/JSON; não executa HTML e não visita URLs.
    return offer;
  });
}
