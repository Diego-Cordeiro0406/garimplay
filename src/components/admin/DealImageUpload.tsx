import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateDealImage } from "@/services/deal-images";

type Props = {
  value: File | null;
  currentImageUrl?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export function DealImageUpload({ value, currentImageUrl, onChange, disabled = false }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }

    setPreview(null);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const validationError = validateDealImage(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    clearPreview();

    const url = URL.createObjectURL(file);
    previewRef.current = url;

    setPreview(url);
    setError(null);
    onChange(file);
  }

  function handleCancel() {
    clearPreview();
    setError(null);
    onChange(null);
  }

  const imageUrl = value ? preview : currentImageUrl;

  return (
    <div className="space-y-3">
      <Label htmlFor="deal-image">Capa do jogo</Label>

      <div className="flex w-full min-w-0 flex-col gap-4 rounded-md border p-4 sm:flex-row">
        <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary sm:w-36">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Pré-visualização da capa do jogo"
              className="h-full w-full object-contain"
            />
          ) : (
            <ImagePlus className="size-10 text-muted-foreground" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium" title={value?.name ?? undefined}>
              {value?.name ?? (currentImageUrl ? "Capa atual" : "Nenhuma capa selecionada")}
            </p>

            <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP • Máximo de 3 MB</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              {imageUrl ? "Trocar capa" : "Selecionar capa"}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={handleCancel}
              >
                <X className="size-4" />
                Cancelar troca
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        id="deal-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={handleChange}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
