import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { DeleteObjectCommand, S3Client } from "npm:@aws-sdk/client-s3";

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_UPLOAD_ORIGINS") ?? "http://localhost:8080,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const KEY_PATTERN =
  /^deals\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

function getEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Variável não configurada: ${name}`);
  }

  return value;
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405, origin);
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ error: "Origem não permitida." }, 403, origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Autenticação necessária." }, 401, origin);
    }

    const token = authHeader.slice(7);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!);

    const supabaseKey = Object.values(publishableKeys)[0] as string;

    // Cliente autenticado: verifica identidade e permissão.
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Sessão inválida ou expirada." }, 401, origin);
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

    if (adminError) {
      console.error("Erro ao verificar administrador:", adminError);

      return jsonResponse({ error: "Erro ao verificar permissões." }, 500, origin);
    }

    if (isAdmin !== true) {
      return jsonResponse({ error: "Acesso restrito a administradores." }, 403, origin);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON inválido." }, 400, origin);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Requisição inválida." }, 400, origin);
    }

    const input = body as Record<string, unknown>;

    if (input.action !== "delete") {
      return jsonResponse({ error: "Operação não permitida." }, 400, origin);
    }

    const key = input.key;

    if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
      return jsonResponse({ error: "Chave de imagem inválida." }, 400, origin);
    }

    const publicBaseUrl = getEnv("R2_PUBLIC_URL").replace(/\/+$/, "");

    const publicUrl = `${publicBaseUrl}/${key}`;

    // Cliente privilegiado: consulta TODAS as ofertas,
    // inclusive rascunhos e ofertas expiradas.
    const adminSupabase = createClient(supabaseUrl, getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: references, error: referenceError } = await adminSupabase
      .from("deals")
      .select("id")
      .eq("image_url", publicUrl)
      .limit(1);

    if (referenceError) {
      console.error("Erro ao consultar referências:", referenceError);

      return jsonResponse({ error: "Não foi possível verificar o uso da imagem." }, 500, origin);
    }

    if (references && references.length > 0) {
      return jsonResponse(
        {
          error: "A imagem ainda está vinculada a uma oferta.",
          code: "IMAGE_IN_USE",
        },
        409,
        origin
      );
    }

    const accountId = getEnv("R2_ACCOUNT_ID");

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
      },
    });

    await s3.send(
      new DeleteObjectCommand({
        Bucket: getEnv("R2_BUCKET_NAME"),
        Key: key,
      })
    );

    console.info("Imagem excluída do R2", {
      key,
      adminId: user.id,
    });

    return jsonResponse(
      {
        success: true,
        key,
        message: "Imagem excluída com sucesso.",
      },
      200,
      origin
    );
  } catch (error) {
    console.error("Erro ao excluir imagem do R2:", error);

    return jsonResponse({ error: "Não foi possível excluir a imagem." }, 500, origin);
  }
});
