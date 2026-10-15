import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max, "Texto muito longo.");

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;

    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Informe uma URL HTTPS válida.");

export function parsePriceToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(cents) ? cents : null;
}

export const dealFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Informe um título com pelo menos 3 caracteres.")
      .max(200, "O título deve ter no máximo 200 caracteres."),

    description: optionalText(5000),
    imageUrl: optionalUrl,

    platformId: z.string().min(1, "Selecione uma plataforma."),
    storeId: z.uuid("Selecione uma loja válida."),

    price: z.string().refine((value) => {
      const cents = parsePriceToCents(value);
      return cents !== null && cents > 0 && cents <= 2147483647;
    }, "Informe um preço válido maior que zero."),

    originalPrice: z.string().refine((value) => {
      if (!value.trim()) return true;
      const cents = parsePriceToCents(value);
      return cents !== null && cents > 0 && cents <= 2147483647;
    }, "Informe um preço original válido."),

    dealUrl: z
      .url("Informe uma URL válida.")
      .refine((value) => value.startsWith("https://"), "O link deve utilizar HTTPS."),

    couponCode: optionalText(100),
    couponUrl: optionalUrl,
    paymentConditions: optionalText(1000),
    rules: optionalText(3000),

    expiresAt: z
      .string()
      .refine(
        (value) => !value || !Number.isNaN(new Date(value).getTime()),
        "Informe uma data válida."
      ),

    status: z.enum(["draft", "published", "expired"]),
  })
  .superRefine((values, context) => {
    const price = parsePriceToCents(values.price);
    const original = values.originalPrice ? parsePriceToCents(values.originalPrice) : null;

    if (price !== null && original !== null && original <= price) {
      context.addIssue({
        code: "custom",
        path: ["originalPrice"],
        message: "O preço original deve ser maior que o preço atual.",
      });
    }

    if (values.couponCode.trim() && values.couponUrl.trim()) {
      context.addIssue({
        code: "custom",
        path: ["couponUrl"],
        message: "Informe um código ou um link de resgate, não ambos.",
      });
    }

    if (
      values.status === "published" &&
      values.expiresAt &&
      new Date(values.expiresAt).getTime() <= Date.now()
    ) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Uma oferta publicada não pode ter validade no passado.",
      });
    }
  });

export type DealFormValues = z.infer<typeof dealFormSchema>;

export const defaultDealFormValues: DealFormValues = {
  title: "",
  description: "",
  imageUrl: "",
  platformId: "",
  storeId: "",
  price: "",
  originalPrice: "",
  dealUrl: "",
  couponCode: "",
  couponUrl: "",
  paymentConditions: "",
  rules: "",
  expiresAt: "",
  status: "draft",
};
