import { createClient } from "npm:@supabase/supabase-js@2";
import { DOMParser } from "npm:linkedom@0.18.13";
import { targetFor, inspectStore } from "./core.ts";
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return json({});
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"),
    serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Not configured" }, 503);
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userDb = createClient(url, serviceKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const {
      data: { user },
      error,
    } = await db.auth.getUser(auth.slice(7));
    if (error || !user) return json({ error: "Unauthorized" }, 401);
    const { data: admin, error: roleError } = await userDb.rpc("is_admin");
    if (roleError || !admin) return json({ error: "Forbidden" }, 403);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Invalid body" }, 400);
    let body = "";
    const decoder = new TextDecoder();
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024) {
        await reader.cancel();
        return json({ error: "Body too large" }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const id = input?.id;
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))
      return json({ error: "Invalid id" }, 400);
    const { data: row, error: readError } = await userDb
      .from("imported_offers")
      .select("source_data,review_status")
      .eq("id", id)
      .single();
    if (readError || !row) return json({ error: "Not found" }, 404);
    if (row.review_status !== "pending") return json({ error: "Import already reviewed" }, 409);
    const original = row.source_data?.product_url;
    const target = targetFor(original);
    if (!target)
      return json({ error: "Loja ou link não suportado. Confira o formato manualmente." }, 422);
    const { data: claim, error: claimError } = await db.rpc("claim_offer_verification", {
      p_url: target.url,
    });
    if (claimError) throw claimError;
    if (claim.busy)
      return json({ error: "Verificação em andamento; tente novamente em instantes." }, 409);
    let result = claim.cached;
    if (!result) {
      try {
        const response = await fetch(target.url, {
          redirect: "manual",
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html", "Accept-Language": "pt-BR" },
        });
        if (
          !response.ok ||
          (response.headers.has("content-type") &&
            !response.headers.get("content-type")!.includes("text/html"))
        ) {
          await response.body?.cancel();
          throw new Error("access");
        }
        const stream = response.body?.getReader();
        if (!stream) throw new Error("empty");
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        while (true) {
          const { done, value } = await stream.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 3_000_000) {
            await stream.cancel();
            throw new Error("size");
          }
          chunks.push(value);
        }
        const buffer = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }
        const document = new DOMParser().parseFromString(
          new TextDecoder().decode(buffer),
          "text/html"
        ) as unknown as Document;
        result = { ...inspectStore(document, target), checked_at: new Date().toISOString() };
      } catch {
        result = {
          result: "unverified",
          checked_at: new Date().toISOString(),
          evidence: [],
          store_checked_url: target.url,
          errors: ["Loja indisponível, bloqueada ou resposta incompatível. Confira manualmente."],
          price_verified: false,
        };
      }
      const { error: saveError } = await db.rpc("complete_offer_verification", {
        p_url: target.url,
        p_token: claim.token,
        p_result: result,
      });
      if (saveError) throw saveError;
    }
    const { error: attachError } = await db.rpc("attach_offer_verification", {
      p_id: id,
      p_expected_url: original,
      p_result: result,
    });
    if (attachError) throw attachError;
    return json({ verification: result, cached: !!claim.cached });
  } catch {
    return json({ error: "Não foi possível verificar agora. Tente novamente mais tarde." }, 500);
  }
});
