import { getCookieConsent } from "./cookie-consent";

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

function deleteAnalyticsCookies() {
  const hostname = window.location.hostname;

  const domains = [
    undefined,
    hostname,
    hostname.startsWith("www.") ? hostname.slice(4) : `.${hostname}`,
  ];

  const cookies = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(
      (name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid" || name === "_gat"
    );

  for (const name of cookies) {
    for (const domain of domains) {
      document.cookie = [
        `${name}=`,
        "Max-Age=0",
        "Path=/",
        "SameSite=Lax",
        domain ? `Domain=${domain}` : "",
      ]
        .filter(Boolean)
        .join("; ");
    }
  }
}

export function initializeAnalytics(): void {
  if (initialized || !MEASUREMENT_ID) return;

  if (getCookieConsent() !== "accepted") return;

  // Reativa a coleta após o consentimento.
  (window as unknown as Record<string, unknown>)[`ga-disable-${MEASUREMENT_ID}`] = false;

  // Inicializa o dataLayer antes de utilizar gtag.
  window.dataLayer = window.dataLayer || [];

  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  window.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  window.gtag("js", new Date());

  window.gtag("config", MEASUREMENT_ID, {
    ...(import.meta.env.DEV && {
      debug_mode: true,
    }),
  });

  const script = document.createElement("script");

  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;

  script.onload = () => {
    if (import.meta.env.DEV) {
      console.log("[GA4] Script carregado com sucesso");
    }
  };

  script.onerror = () => {
    console.error("[GA4] Falha ao carregar script");
  };

  document.head.appendChild(script);

  initialized = true;
}

export function disableAnalytics(): void {
  if (window.gtag) {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  if (MEASUREMENT_ID) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${MEASUREMENT_ID}`] = true;
  }

  deleteAnalyticsCookies();
}
