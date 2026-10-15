import { getCookieConsent } from "./cookie-consent";

type AnalyticsParams = Record<string, string | number | boolean>;

export function trackEvent(eventName: string, params?: AnalyticsParams): boolean {
  if (typeof window === "undefined") return false;
  if (getCookieConsent() !== "accepted") return false;
  if (typeof window.gtag !== "function") return false;

  window.gtag("event", eventName, {
    ...params,
    ...(import.meta.env.DEV && {
      debug_mode: true,
    }),
  });

  return true;
}

export function trackDealView(deal: {
  id: string;
  title: string;
  store: string;
  platform: string;
  price: number;
}): boolean {
  return trackEvent("view_deal", {
    deal_id: deal.id,
    deal_title: deal.title,
    store: deal.store,
    platform: deal.platform,
    price: deal.price,
  });
}

export function trackDealClick(deal: { id: string; store: string; platform: string }): boolean {
  return trackEvent("deal_outbound_click", {
    deal_id: deal.id,
    store: deal.store,
    platform: deal.platform,
  });
}
