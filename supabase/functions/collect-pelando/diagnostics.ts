export type Diagnostic = {
  kind: string;
  stage: string;
  http_status?: number;
  content_type?: string;
  response_format?: string;
  html_title?: string;
  top_level_keys?: string[];
  data_keys?: string[];
  error_type?: string;
  cause_code?: string;
};
export class CollectionFailure extends Error {
  readonly diagnostic: Diagnostic;
  constructor(diagnostic: Diagnostic) {
    super(`${diagnostic.kind}:${diagnostic.stage}`);
    this.name = "CollectionFailure";
    this.diagnostic = diagnostic;
  }
}
const keys = (value: unknown): string[] =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value)
        .slice(0, 12)
        .map((key) => key.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 64))
    : [];
export function shapeOf(value: unknown) {
  const data =
    value && typeof value === "object" ? (value as Record<string, unknown>).data : undefined;
  return { top_level_keys: keys(value), data_keys: keys(data) };
}
export function safeFailure(error: unknown, stage: string): Diagnostic {
  if (error instanceof CollectionFailure) return error.diagnostic;
  const name = error instanceof Error ? error.name : typeof error;
  const cause =
    error instanceof Error && error.cause && typeof error.cause === "object"
      ? (error.cause as Record<string, unknown>)
      : {};
  const causeCode =
    typeof cause.code === "string" && /^[A-Z0-9_]{1,60}$/.test(cause.code) ? cause.code : undefined;
  return {
    kind: ["AbortError", "TimeoutError"].includes(name)
      ? "timeout"
      : name === "TypeError"
        ? "network_or_runtime"
        : "unexpected",
    stage,
    error_type: name.slice(0, 60),
    ...(causeCode ? { cause_code: causeCode } : {}),
  };
}
export function safeResponseMetadata(text: string, contentType: string) {
  const trimmed = text.trimStart();
  if (/^(?:<!doctype\s+html|<html)/i.test(trimmed)) {
    const title = text
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/[\r\n\t]+/g, " ")
      .trim()
      .slice(0, 120);
    return { response_format: "html", ...(title ? { html_title: title } : {}) };
  }
  try {
    return { response_format: "json", ...shapeOf(JSON.parse(text)) };
  } catch {
    return {
      response_format: contentType.includes("json") ? "invalid_json" : "other",
    };
  }
}
