import { supabase } from "@/integrations/supabase/client";

export const MAX_DEAL_IMAGE_SIZE = 3 * 1024 * 1024;

export const ALLOWED_DEAL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type SignedUploadResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
};

export type UploadedDealImage = {
  key: string;
  publicUrl: string;
};

export function validateDealImage(file: File): string | null {
  if (!ALLOWED_DEAL_IMAGE_TYPES.some((type) => type === file.type)) {
    return "Selecione uma imagem JPEG, PNG ou WebP.";
  }

  if (file.size === 0) {
    return "O arquivo selecionado está vazio.";
  }

  if (file.size > MAX_DEAL_IMAGE_SIZE) {
    return "A imagem deve ter no máximo 3 MB.";
  }

  return null;
}

export async function uploadDealImage(file: File): Promise<UploadedDealImage> {
  const validationError = validateDealImage(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const { data, error } = await supabase.functions.invoke<SignedUploadResponse>(
    "generate-deal-image-upload",
    {
      body: {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      },
    }
  );

  if (error || !data?.uploadUrl || !data.publicUrl) {
    throw new Error(error?.message ?? "Não foi possível preparar o upload da capa.");
  }

  const response = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Não foi possível enviar a capa ao armazenamento (${response.status}).`);
  }

  return {
    key: data.key,
    publicUrl: data.publicUrl,
  };
}

export function getDealImageKey(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;

  if (!publicBaseUrl) {
    return null;
  }

  try {
    const image = new URL(imageUrl);
    const base = new URL(publicBaseUrl);

    if (image.origin !== base.origin) {
      return null;
    }

    if (image.search || image.hash) {
      return null;
    }

    const prefix = base.pathname.replace(/\/+$/, "");
    const pathPrefix = `${prefix}/`;

    if (!image.pathname.startsWith(pathPrefix)) {
      return null;
    }

    const key = image.pathname.slice(pathPrefix.length);

    const keyPattern =
      /^deals\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

    return keyPattern.test(key) ? key : null;
  } catch {
    return null;
  }
}

export async function deleteDealImage(key: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{
    success?: boolean;
    error?: string;
  }>("manage-deal-image", {
    body: {
      action: "delete",
      key,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error(data?.error ?? "Não foi possível excluir a capa.");
  }
}
