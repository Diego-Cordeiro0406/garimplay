import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

import { getHomeScroll, saveHomeScroll } from "@/lib/scroll-restoration";

export function useHomeScrollRestoration(isReady: boolean) {
  const location = useLocation();
  const navigationType = useNavigationType();

  const restoringRef = useRef(false);
  const restoredRef = useRef(false);

  const savedPositionRef = useRef<number | null>(
    navigationType === "POP" ? getHomeScroll(location.key) : null
  );

  // Evita sobrescrever a posição enquanto aguardamos
  // o carregamento das ofertas.
  useEffect(() => {
    function handleScroll() {
      if (restoringRef.current || !restoredRef.current) {
        return;
      }

      saveHomeScroll(location.key, window.scrollY);
    }

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.key]);

  useLayoutEffect(() => {
    if (!isReady || restoredRef.current) return;

    const savedPosition = savedPositionRef.current;

    if (savedPosition === null) {
      restoredRef.current = true;
      return;
    }

    restoringRef.current = true;

    const frame = requestAnimationFrame(() => {
      window.scrollTo({
        top: savedPosition,
        left: 0,
        behavior: "instant",
      });

      restoringRef.current = false;
      restoredRef.current = true;
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isReady]);
}
