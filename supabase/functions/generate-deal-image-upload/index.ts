import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const UPLOAD_URL_EXPIRES_IN = 60;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_UPLOAD_ORIGINS") ?? "http://localhost:8080,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Variável de ambiente não configurada: ${name}`);
  }

  return value;
}

serve(async (req: Request) => {
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

    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!);

    const supabaseKey = Object.values(publishableKeys)[0] as string;

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

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

    const token = authHeader.slice(7);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Sessão inválida ou expirada." }, 401, origin);
    }

    // Usa a função is_admin() existente no Garimplay.
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");

    if (roleError) {
      console.error("Erro ao verificar administrador:", roleError);

      return jsonResponse({ error: "Não foi possível verificar as permissões." }, 500, origin);
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
      return jsonResponse({ error: "Dados de upload inválidos." }, 400, origin);
    }

    const input = body as Record<string, unknown>;
    const { fileName, contentType, fileSize } = input;

    if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 255) {
      return jsonResponse({ error: "Nome de arquivo inválido." }, 400, origin);
    }

    if (typeof contentType !== "string" || !Object.hasOwn(ALLOWED_TYPES, contentType)) {
      return jsonResponse({ error: "Formato não permitido. Use JPEG, PNG ou WebP." }, 400, origin);
    }

    if (
      typeof fileSize !== "number" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return jsonResponse({ error: "A imagem deve ter no máximo 3 MB." }, 400, origin);
    }

    const accountId = getRequiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");
    const bucket = getRequiredEnv("R2_BUCKET_NAME");
    const publicBaseUrl = getRequiredEnv("R2_PUBLIC_URL").replace(/\/+$/, "");

    const extension = ALLOWED_TYPES[contentType];
    const key = `deals/${crypto.randomUUID()}.${extension}`;

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: UPLOAD_URL_EXPIRES_IN,
    });

    return jsonResponse(
      {
        uploadUrl,
        key,
        publicUrl: `${publicBaseUrl}/${key}`,
        expiresIn: UPLOAD_URL_EXPIRES_IN,
      },
      200,
      origin
    );
  } catch (error) {
    console.error("Erro ao gerar URL de upload:", error);

    return jsonResponse({ error: "Não foi possível preparar o upload da imagem." }, 500, origin);
  }
});
