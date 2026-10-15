import { useState } from "react";
import { LoaderCircle, Search, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { extractProductMetadata, type ExtractedProduct } from "@/services/productMetadata";

type ProductMetadataSearchProps = {
  onSuccess: (metadata: ExtractedProduct) => void;
  disabled?: boolean;
};

export function ProductMetadataSearch({ onSuccess, disabled = false }: ProductMetadataSearchProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSearch() {
    if (!url.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const metadata = await extractProductMetadata(url.trim());

      onSuccess(metadata);
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível buscar as informações.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border p-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
          <WandSparkles className="size-4 text-primary" />
        </div>

        <div>
          <h2 className="font-semibold">Preenchimento automático</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Cole o link de um produto para buscar suas informações.
          </p>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <Label htmlFor="productMetadataUrl">Link do produto</Label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="productMetadataUrl"
            type="url"
            placeholder="https://www.amazon.com.br/dp/..."
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setSuccess(false);
              setError(null);
            }}
            disabled={disabled || isLoading}
          />

          <Button
            type="button"
            onClick={() => void handleSearch()}
            disabled={disabled || isLoading || !url.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}

            {isLoading ? "Buscando..." : "Buscar informações"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="text-sm text-muted-foreground">
            Informações encontradas. Confira os campos antes de salvar.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Alguns dados podem não estar disponíveis. Confira os preços e as condições de pagamento
          manualmente.
        </p>
      </div>
    </section>
  );
}
