import { useEffect, useState } from "react";
import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { getDealById } from "@/services/deals";
import {
  generatePublicationSvg,
  svgToPng,
  type PublicationFormat,
} from "@/lib/generatePublication";

interface DealPublicationDialogProps {
  dealId: string | null;
  onClose: () => void;
}

interface PublicationPreviewProps {
  dealId: string;
  format: PublicationFormat;
}

type GenerationState =
  | { status: "loading" }
  | { status: "success"; preview: string }
  | { status: "error"; message: string };

function PublicationPreview({ dealId, format }: PublicationPreviewProps) {
  const [state, setState] = useState<GenerationState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function generate() {
      try {
        const deal = await getDealById(dealId);

        if (!deal) {
          throw new Error("Oferta não encontrada ou não publicada.");
        }

        const svg = await generatePublicationSvg(deal, format);
        const png = await svgToPng(svg, format);

        if (!active) return;

        objectUrl = URL.createObjectURL(png);

        setState({
          status: "success",
          preview: objectUrl,
        });
      } catch (error) {
        if (!active) return;

        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Erro ao gerar publicação.",
        });
      }
    }

    void generate();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dealId, format]);

  function download() {
    if (state.status !== "success") return;

    const anchor = document.createElement("a");

    anchor.href = state.preview;
    anchor.download = `garimplay-${format}-${dealId.slice(0, 8)}.png`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <>
      <div className="flex min-h-56 items-center justify-center rounded-md bg-secondary p-3">
        {state.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Gerando imagem…</p>
        ) : state.status === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : (
          <img
            src={state.preview}
            alt="Prévia da publicação"
            className="max-h-[50dvh] w-auto object-contain"
          />
        )}
      </div>

      <Button disabled={state.status !== "success"} onClick={download}>
        <Download className="size-4" />
        Baixar PNG
      </Button>
    </>
  );
}

export function DealPublicationDialog({ dealId, onClose }: DealPublicationDialogProps) {
  const [format, setFormat] = useState<PublicationFormat>("story");

  const link = dealId ? `https://garimplay.com.br/ofertas/${dealId}` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      window.alert("Link da oferta copiado.");
    } catch {
      window.alert("Não foi possível copiar o link.");
    }
  }

  return (
    <Dialog
      open={Boolean(dealId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerar publicação</DialogTitle>

          <DialogDescription>
            Crie a arte e adicione o sticker de link manualmente no Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={format === "story" ? "default" : "outline"}
            onClick={() => setFormat("story")}
          >
            Story (9:16)
          </Button>

          <Button
            variant={format === "feed" ? "default" : "outline"}
            onClick={() => setFormat("feed")}
          >
            Feed (4:5)
          </Button>
        </div>

        {dealId && (
          <div key={`${dealId}-${format}`} className="flex flex-col gap-3">
            <PublicationPreview dealId={dealId} format={format} />
          </div>
        )}

        <Button variant="outline" disabled={!dealId} onClick={() => void copyLink()}>
          <Copy className="size-4" />
          Copiar link da oferta
        </Button>

        <p className="text-xs text-muted-foreground">
          O sticker de link deve ser adicionado no aplicativo do Instagram. Verifique preço e
          disponibilidade antes de publicar.
        </p>
      </DialogContent>
    </Dialog>
  );
}
