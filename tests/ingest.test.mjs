import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBatch, sameSecret } from "../supabase/functions/ingest-offers/validation.ts";
const offer = () => ({
  source: "pelando",
  external_id: "1",
  title: "Jogo PS5",
  currency: "BRL",
  price_cents: 0,
  collected_at: "2026-01-01T10:00:00Z",
  source_status: "active",
  source_url: "https://www.pelando.com.br/d/jogo",
  product_url: "https://www.amazon.com.br/dp/B012345678",
  image_url: null,
});
test("aceita preço zero e preserva dados da origem", () => {
  assert.equal(parseBatch({ offers: [offer()] })[0].price_cents, 0);
  assert.equal(parseBatch({ offers: [{ ...offer(), price_cents: null }] })[0].price_cents, null);
});
test("rejeita lotes inválidos e URLs inseguras", () => {
  for (const input of [
    { offers: [] },
    { offers: [offer(), offer()] },
    { offers: [{ ...offer(), source: "other" }] },
    { offers: [{ ...offer(), price_cents: -1 }] },
    { offers: [{ ...offer(), source_url: "https://evil.test/d/jogo" }] },
    { offers: [{ ...offer(), product_url: "javascript:alert(1)" }] },
    { offers: [{ ...offer(), collected_at: "2026-01-01T10:00:00" }] },
  ]) {
    assert.throws(() => parseBatch(input));
  }
});
test("compara segredos sem aceitar ausência ou valor diferente", async () => {
  assert.equal(await sameSecret("secret", "secret"), true);
  assert.equal(await sameSecret("other", "secret"), false);
  assert.equal(await sameSecret("", "secret"), false);
});
