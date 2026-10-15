import { useState } from "react";
import { ArrowUpRight, Check, Copy, TicketPercent } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CouponCodeProps {
  code?: string | null;
  url?: string | null;
}

export function CouponCode({ code, url }: CouponCodeProps) {
  const [copied, setCopied] = useState(false);

  if (!code && !url) return null;

  async function handleCopy() {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <TicketPercent className="size-4 text-primary" />

        <h2 className="text-sm font-semibold">Cupom de desconto</h2>
      </div>

      {url ? (
        <Button
          nativeButton={false}
          variant="outline"
          className="w-full"
          render={<a href={url} target="_blank" rel="noopener noreferrer" />}
        >
          Resgatar cupom
          <ArrowUpRight className="size-4" />
        </Button>
      ) : (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-primary/50 bg-primary/5 p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-sm font-semibold tracking-wide text-foreground">
            {code}
          </code>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar
              </>
            )}
          </Button>
        </div>
      )}

      <p aria-live="polite" className="text-xs text-muted-foreground">
        {url
          ? "Acesse a página de cupons da loja e resgate o desconto antes de finalizar sua compra."
          : copied
            ? "Cupom copiado para a área de transferência."
            : "Copie o código e aplique-o na loja, conforme as regras da promoção."}
      </p>
    </section>
  );
}
