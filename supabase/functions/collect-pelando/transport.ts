import { CollectionFailure, safeFailure, safeResponseMetadata } from "./diagnostics.ts";

type Fetch = (input: string, init: RequestInit) => Promise<Response>;
export function createPelandoPageGetter(visitorId: unknown, fetcher: Fetch = fetch) {
  return async (params: URLSearchParams, timeoutMs: number): Promise<unknown> => {
    if (typeof visitorId !== "string" || !/^[a-f0-9-]{36}$/i.test(visitorId)) {
      throw new CollectionFailure({
        kind: "configuration",
        stage: "visitor_id",
      });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let stage = "fetch";
    try {
      const response = await fetcher(`https://api-web.pelando.com.br/feed/v2/search?${params}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "GarimplayCollector/1.0",
          Referer: "https://www.pelando.com.br/",
          "x-sosho-unlogged-id": visitorId,
        },
        signal: controller.signal,
        // Não segue redirecionamentos; registra a resposta 3xx para diagnosticar.
        redirect: "manual",
      });
      stage = "read_response";
      const contentType = (response.headers.get("content-type") ?? "").slice(0, 100);
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        // Erros HTTP precisam só de uma amostra limitada para identificar JSON/HTML.
        const limit = response.ok ? 1_000_000 : 4096;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const available = limit - size;
          const chunk = value.subarray(0, Math.max(0, available));
          size += chunk.length;
          chunks.push(chunk);
          if (value.length > available || size === limit) {
            await reader.cancel();
            if (response.ok)
              throw new CollectionFailure({
                kind: "response_too_large",
                stage,
                http_status: response.status,
                content_type: contentType,
              });
            break;
          }
        }
      }
      const buffer = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      const text = new TextDecoder().decode(buffer);
      const metadata = {
        http_status: response.status,
        content_type: contentType,
      };
      if (!response.ok)
        throw new CollectionFailure({
          kind: "http_error",
          stage: "http_response",
          ...metadata,
          ...safeResponseMetadata(text, contentType),
        });
      stage = "parse_json";
      try {
        return JSON.parse(text);
      } catch {
        throw new CollectionFailure({
          kind: "invalid_json",
          stage,
          ...metadata,
          ...safeResponseMetadata(text, contentType),
        });
      }
    } catch (error) {
      if (error instanceof CollectionFailure) throw error;
      if (controller.signal.aborted) throw new CollectionFailure({ kind: "timeout", stage });
      throw new CollectionFailure(safeFailure(error, stage));
    } finally {
      clearTimeout(timer);
    }
  };
}
