import { z } from "zod";

const optionalHttpsUrl = z
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

export const storeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da loja.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  websiteUrl: optionalHttpsUrl,
  logoUrl: optionalHttpsUrl,
});

export type StoreFormValues = z.infer<typeof storeFormSchema>;

export const defaultStoreFormValues: StoreFormValues = {
  name: "",
  websiteUrl: "",
  logoUrl: "",
};
