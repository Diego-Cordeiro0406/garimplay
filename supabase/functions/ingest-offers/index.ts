import { createClient } from "npm:@supabase/supabase-js@2";
import { parseBatch, sameSecret } from "./validation.ts";

const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("OFFERS_INGEST_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || secret.length < 32 || !url || !key)
    return reply({ error: "Service not configured" }, 503);
  if (!(await sameSecret(request.headers.get("x-ingest-key") ?? "", secret))) {
    return reply({ error: "Unauthorized" }, 401);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return reply({ error: "Expected application/json" }, 415);
  }
  let batch;
  try {
    // Limita o corpo mesmo em transferência sem Content-Length.
    if (!request.body) throw new Error("Empty body");
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1_000_000) {
        await reader.cancel();
        return reply({ error: "Body too large" }, 413);
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    batch = parseBatch(JSON.parse(new TextDecoder().decode(body)));
  } catch {
    return reply({ error: "Invalid offer batch" }, 400);
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc("ingest_imported_offers", { p_offers: batch });
  if (error) {
    console.error("ingest-offers database failure", error.code);
    return reply({ error: "Unable to persist batch" }, 500);
  }
  return reply(data);
});
