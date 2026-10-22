import type { Deal } from "@/types/deal";
import { calculateDiscount, formatPrice, PLATFORM_LABELS } from "@/lib/deals";

export type PublicationFormat = "story" | "feed";
const NS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";

function wrap(text: string, limit: number, lines: number): string[] {
  const words = text.trim().split(/\s+/);
  const output: string[] = [];
  for (const word of words) {
    const current = output.length - 1;
    if (current < 0 || (output[current] + " " + word).length > limit) output.push(word);
    else output[current] += " " + word;
  }
  if (output.length > lines) {
    const kept = output.slice(0, lines);
    kept[lines - 1] = kept[lines - 1].slice(0, Math.max(1, limit - 1)).trimEnd() + "…";
    return kept;
  }
  return output;
}

async function inlineImage(url: string): Promise<string> {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("Não foi possível carregar a capa da oferta.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao converter a capa."));
    reader.readAsDataURL(blob);
  });
}

export async function generatePublicationSvg(
  deal: Deal,
  format: PublicationFormat
): Promise<string> {
  const response = await fetch(`/templates/garimplay-${format}.svg`);
  if (!response.ok) throw new Error("Template de publicação não encontrado.");
  const doc = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("Template SVG inválido.");
  const setText = (id: string, value: string) => {
    const element = doc.getElementById(id);
    if (element) element.textContent = value;
  };
  setText("PLATAFORMA", PLATFORM_LABELS[deal.platform]);
  setText("PRECO_ATUAL", formatPrice(deal.price));
  setText(
    "PRECO_ANTIGO",
    deal.originalPrice != null && deal.originalPrice > deal.price
      ? formatPrice(deal.originalPrice)
      : ""
  );
  setText("LOJA", deal.store.name);
  const discount = calculateDiscount(deal.price, deal.originalPrice);
  setText("DESCONTO", discount != null ? `-${discount}%` : "");
  if (discount == null) {
    doc.getElementById("DESCONTO_BG")?.remove();
    const discountText = doc.getElementById("DESCONTO");
    if (discountText?.previousElementSibling?.tagName.toLowerCase() === "rect" && format === "feed")
      discountText.previousElementSibling.remove();
  }
  const title = doc.getElementById("TITULO_JOGO");
  if (title) {
    title.textContent = "";
    const maxLines = format === "story" ? 2 : 4;
    const lines = wrap(deal.title, format === "story" ? 33 : 20, maxLines);
    const x = title.getAttribute("x") || "0";
    lines.forEach((line, index) => {
      const tspan = doc.createElementNS(NS, "tspan");
      tspan.setAttribute("x", x);
      tspan.setAttribute("dy", index ? "1.12em" : "0");
      tspan.textContent = line;
      title.appendChild(tspan);
    });
  }
  if (deal.imageUrl) {
    const imageData = await inlineImage(deal.imageUrl);
    const placeholder = doc.getElementById("CAPA_SUBSTITUIR_POR_IMAGEM");
    if (placeholder?.parentNode) {
      const image = doc.createElementNS(NS, "image");
      const [x, y, width, height] = format === "story" ? [235, 630, 610, 680] : [70, 260, 420, 590];
      Object.entries({ x, y, width, height }).forEach(([key, value]) =>
        image.setAttribute(key, String(value))
      );
      image.setAttribute("preserveAspectRatio", "xMidYMid meet");
      image.setAttribute("href", imageData);
      image.setAttributeNS(XLINK, "xlink:href", imageData);
      placeholder.parentNode.replaceChild(image, placeholder);
    }
  }
  return new XMLSerializer().serializeToString(doc);
}

export async function svgToPng(svg: string, format: PublicationFormat): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Falha ao renderizar a publicação."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = format === "story" ? 1920 : 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao exportar PNG."))),
        "image/png"
      )
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
