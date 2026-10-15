import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getCookieConsent, saveCookieConsent, type CookieConsent } from "@/lib/cookie-consent";

import { initializeAnalytics, disableAnalytics } from "@/lib/google-analytics";

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent>(getCookieConsent);

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (consent === "accepted") {
      initializeAnalytics();
    }
  }, [consent]);

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true);

    window.addEventListener("open-cookie-preferences", openSettings);

    return () => {
      window.removeEventListener("open-cookie-preferences", openSettings);
    };
  }, []);

  function handleConsent(accepted: boolean) {
    const previousConsent = getCookieConsent();
    const choice = accepted ? "accepted" : "rejected";

    saveCookieConsent(choice);
    setConsent(choice);
    setSettingsOpen(false);

    if (accepted) {
      initializeAnalytics();

      window.dispatchEvent(new Event("analytics-consent-granted"));

      return;
    }

    disableAnalytics();

    if (previousConsent === "accepted") {
      window.location.reload();
    }
  }

  return (
    <>
      {consent === null && (
        <div
          role="region"
          aria-label="Consentimento de cookies"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-lg border bg-background p-3 shadow-lg sm:inset-x-6 sm:bottom-5 sm:p-4"
        >
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">Sua privacidade importa</h2>

            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Usamos cookies opcionais para analisar visitas e melhorar o Garimplay. Você pode
              alterar sua escolha a qualquer momento.{" "}
              <Link
                to="/privacidade"
                className="text-foreground underline underline-offset-2 hover:text-primary"
              >
                Saiba mais
              </Link>
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleConsent(false)}
            >
              Recusar
            </Button>

            <Button size="sm" className="w-full" onClick={() => handleConsent(true)}>
              Aceitar analytics
            </Button>
          </div>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferências de cookies</DialogTitle>

            <DialogDescription>
              Escolha como o Garimplay pode utilizar cookies e tecnologias semelhantes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">Essenciais</h3>

                <span className="text-xs text-muted-foreground">Sempre ativos</span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Necessários para funcionalidades básicas e para armazenar suas preferências.
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Analíticos</h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Ajudam a entender visitas, visualizações de ofertas e cliques nas lojas por meio do
                Google Analytics.
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                Preferência atual: {consent === "accepted" ? "Permitidos" : "Não permitidos"}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleConsent(false)}>
              Recusar opcionais
            </Button>

            <Button onClick={() => handleConsent(true)}>Aceitar analytics</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
