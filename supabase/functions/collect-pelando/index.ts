import { createClient } from "npm:@supabase/supabase-js@2";
import { parseBatch } from "../ingest-offers/validation.ts";
import { verifySchedule } from "./auth.ts";
import { createPelandoPageGetter } from "./transport.ts";
import { safeFailure } from "./diagnostics.ts";
import { collect, type CursorMap } from "./core.ts";
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("OFFERS_INGEST_SECRET");
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || secret.length < 32 || !url || !key) return json({ error: "Not configured" }, 503);
  const nonce = request.headers.get("x-collector-nonce") ?? "";
  if (
    !(await verifySchedule(
      request.headers.get("x-collector-time") ?? "",
      nonce,
      request.headers.get("x-collector-signature") ?? "",
      secret
    ))
  )
    return json({ error: "Unauthorized" }, 401);
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data: claim, error } = await db.rpc("claim_pelando_collection", {
      p_nonce: nonce,
    });
    if (error) throw error;
    if (!claim) return json({ skipped: "disabled_or_running" });
    const output = await collect(
      createPelandoPageGetter(claim.visitor_id),
      (claim.cursors ?? {}) as CursorMap
    );
    // Mesmo validador da ingestão Python. Não invoca outra Edge Function.
    const valid = [];
    for (const offer of output.offers) {
      try {
        valid.push(parseBatch({ offers: [offer] })[0]);
      } catch {
        /* Descarta registro incompatível. */
      }
    }
    const { data, error: finishError } = await db.rpc("finish_pelando_collection", {
      p_token: claim.token,
      p_offers: valid,
      p_cursors: output.cursors,
      p_summary: {
        ...output.summary,
        validation_rejected: output.offers.length - valid.length,
      },
    });
    if (finishError) throw finishError;
    const failed = output.summary.outcome === "failed";
    return json({ ...output.summary, ...data }, failed ? 502 : 200);
  } catch (error) {
    // Não registra mensagens arbitrárias, corpos remotos, headers ou segredos.
    return json(
      {
        error: "Collection failed; next scheduled run can retry",
        diagnostic: safeFailure(error, "handler"),
      },
      500
    );
  }
});
