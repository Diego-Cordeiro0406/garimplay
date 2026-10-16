import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarClock, Gamepad2, LoaderCircle, Save, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { dealFormSchema, defaultDealFormValues, type DealFormValues } from "@/schemas/deal.schema";
import { useDealFormOptions, useSaveAdminDeal } from "@/hooks/useAdminDealForm";
import type { Database } from "@/integrations/supabase/types";

import { centsToInput, toLocalDateTime } from "@/lib/formatters";
import { DealImageUpload } from "./DealImageUpload";
import type { ExtractedProduct } from "@/services/productMetadata";
import { ProductMetadataSearch } from "./ProductMetadataSearch";

type DealRecord = Database["public"]["Tables"]["deals"]["Row"];

type DealFormProps = {
  deal?: DealRecord;
  importId?: string;
  initialValues?: DealFormValues;
};

function mapDealToForm(deal: DealRecord): DealFormValues {
  return {
    title: deal.title,
    description: deal.description ?? "",
    imageUrl: deal.image_url ?? "",
    platformId: deal.platform_id,
    storeId: deal.store_id,
    price: centsToInput(deal.price_cents),
    originalPrice: centsToInput(deal.original_price_cents),
    dealUrl: deal.deal_url,
    couponCode: deal.coupon_code ?? "",
    couponUrl: deal.coupon_url ?? "",
    paymentConditions: deal.payment_conditions ?? "",
    rules: deal.rules ?? "",
    expiresAt: toLocalDateTime(deal.expires_at),
    status: deal.status as DealFormValues["status"],
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Gamepad2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border p-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
          <Icon className="size-4 text-primary" />
        </div>

        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="space-y-5 p-5">{children}</div>
    </section>
  );
}

export function DealForm({ deal, importId, initialValues }: DealFormProps) {
  const navigate = useNavigate();
  const isEditing = Boolean(deal);

  const optionsQuery = useDealFormOptions();
  const saveDeal = useSaveAdminDeal(deal?.id, importId);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: initialValues ?? defaultDealFormValues,
    mode: "onBlur",
  });

  const couponUrl = useWatch({
    control,
    name: "couponUrl",
  });

  useEffect(() => {
    if (deal) {
      reset(mapDealToForm(deal));
    }
  }, [deal, reset]);

  function handleMetadataSuccess(metadata: ExtractedProduct) {
    const fillIfEmpty = (field: keyof DealFormValues, value: string | null) => {
      if (!value || getValues(field)) return;

      setValue(field, value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    };

    fillIfEmpty("title", metadata.title);
    fillIfEmpty("dealUrl", metadata.url);

    // Loja
    const storeNames: Record<ExtractedProduct["store"], string> = {
      amazon: "amazon",
      mercadolivre: "mercado livre",
      kabum: "kabum",
      shopee: "shopee",
    };

    const store = optionsQuery.data?.stores.find((option) =>
      option.name.toLowerCase().includes(storeNames[metadata.store])
    );

    fillIfEmpty("storeId", store?.id ?? null);

    // Plataforma
    if (metadata.platform) {
      const platform = optionsQuery.data?.platforms.find(
        (option) => option.name.toLowerCase() === metadata.platform?.toLowerCase()
      );

      fillIfEmpty("platformId", platform?.id ?? null);
    }

    // Preços permanecem para preenchimento manual.
  }

  async function onSubmit(values: DealFormValues) {
    try {
      const saved = await saveDeal.mutateAsync({
        values,
        image: selectedImage,
      });
      navigate(importId ? `/admin/ofertas/${saved.id}/editar` : "/admin/ofertas", {
        replace: true,
      });
    } catch {
      // A mensagem de erro será exibida pela mutation.
    }
  }

  function onInvalid(formErrors: FieldErrors<DealFormValues>) {
    const firstField = Object.keys(formErrors)[0];

    if (firstField) {
      document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
    }
  }

  const saving = isSubmitting || saveDeal.isPending;

  return (
    <div className="space-y-7 w-full min-w-0">
      <div className="space-y-4">
        <Link className="flex text-sm items-center" to="/admin/ofertas">
          <ArrowLeft className="size-4 mr-1" />
          Voltar para ofertas
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Administração
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {isEditing ? "Editar oferta" : importId ? "Revisar importação" : "Nova oferta"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {isEditing
              ? "Atualize as informações da promoção."
              : "Cadastre uma nova promoção de mídia física."}
          </p>
        </div>
      </div>

      {optionsQuery.isPending ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Carregando lojas e plataformas...
        </div>
      ) : optionsQuery.isError ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-destructive">Não foi possível carregar lojas e plataformas.</p>
          <Button variant="outline" className="mt-4" onClick={() => void optionsQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          noValidate
          className="w-full min-w-0 space-y-6"
        >
          {!isEditing && (
            <ProductMetadataSearch onSuccess={handleMetadataSuccess} disabled={saving} />
          )}
          <FormSection
            icon={Gamepad2}
            title="Informações do jogo"
            description="Dados utilizados para apresentar o jogo no Garimplay."
          >
            <div className="space-y-2">
              <Label htmlFor="title">Título do jogo *</Label>
              <Input
                id="title"
                placeholder="Ex.: Elden Ring - Edição Física PS5"
                aria-invalid={Boolean(errors.title)}
                {...register("title")}
              />
              <FieldError message={errors.title?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Descreva o jogo e os detalhes relevantes da oferta..."
                {...register("description")}
              />
              <FieldError message={errors.description?.message} />
            </div>

            <DealImageUpload
              value={selectedImage}
              currentImageUrl={getValues("imageUrl")}
              onChange={setSelectedImage}
              disabled={saving}
            />

            <div className="space-y-2">
              <Label>Plataforma *</Label>

              <Controller
                name="platformId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label="Plataforma"
                      aria-invalid={Boolean(errors.platformId)}
                    >
                      <SelectValue>
                        {optionsQuery.data.platforms.find((option) => option.id === field.value)
                          ?.name ?? "Selecione uma plataforma"}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                      {optionsQuery.data.platforms.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              <FieldError message={errors.platformId?.message} />
            </div>
          </FormSection>

          <FormSection
            icon={Tag}
            title="Informações da promoção"
            description="Loja, preços e condições para aproveitar a oferta."
          >
            <div className="space-y-2">
              <Label>Loja *</Label>

              <Controller
                name="storeId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label="Loja"
                      aria-invalid={Boolean(errors.storeId)}
                    >
                      <SelectValue>
                        {optionsQuery.data.stores.find((option) => option.id === field.value)
                          ?.name ?? "Selecione uma loja"}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                      {optionsQuery.data.stores.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              <FieldError message={errors.storeId?.message} />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="price">Preço atual (R$) *</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  placeholder="149,90"
                  aria-invalid={Boolean(errors.price)}
                  {...register("price")}
                />
                <FieldError message={errors.price?.message} />
              </div>

              <div className="space-y-2 min-w-0">
                <Label htmlFor="originalPrice">Preço original (R$)</Label>
                <Input
                  id="originalPrice"
                  inputMode="decimal"
                  placeholder="249,90"
                  aria-invalid={Boolean(errors.originalPrice)}
                  {...register("originalPrice")}
                />
                <FieldError message={errors.originalPrice?.message} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dealUrl">Link da oferta *</Label>
              <Input
                id="dealUrl"
                type="url"
                placeholder="https://loja.com.br/produto"
                aria-invalid={Boolean(errors.dealUrl)}
                {...register("dealUrl")}
              />
              <FieldError message={errors.dealUrl?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="couponUrl">Link para resgatar cupom</Label>

              <Input
                id="couponUrl"
                type="url"
                placeholder="https://shopee.com.br/m/cupom-de-desconto"
                aria-invalid={Boolean(errors.couponUrl)}
                {...register("couponUrl", {
                  onChange: (event) => {
                    if (event.target.value.trim()) {
                      setValue("couponCode", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  },
                })}
              />

              <FieldError message={errors.couponUrl?.message} />

              <p className="text-xs text-muted-foreground">
                Informe a página onde o cliente poderá resgatar o cupom.
              </p>
            </div>

            {!couponUrl?.trim() && (
              <div className="space-y-2">
                <Label htmlFor="couponCode">Código do cupom</Label>

                <Input
                  id="couponCode"
                  placeholder="Ex.: GAME20"
                  aria-invalid={Boolean(errors.couponCode)}
                  {...register("couponCode")}
                />

                <FieldError message={errors.couponCode?.message} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="paymentConditions">Condições de pagamento</Label>
              <Textarea
                id="paymentConditions"
                rows={3}
                placeholder="Ex.: Valor no Pix ou em até 10x no cartão."
                {...register("paymentConditions")}
              />
              <FieldError message={errors.paymentConditions?.message} />
            </div>
          </FormSection>

          <FormSection
            icon={CalendarClock}
            title="Publicação"
            description="Defina as regras, a validade e a visibilidade da oferta."
          >
            <div className="space-y-2">
              <Label htmlFor="rules">Regras da promoção</Label>
              <Textarea
                id="rules"
                rows={3}
                placeholder="Ex.: Cupom válido apenas para produtos selecionados."
                {...register("rules")}
              />
              <FieldError message={errors.rules?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Data e horário de expiração</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                aria-invalid={Boolean(errors.expiresAt)}
                {...register("expiresAt")}
              />
              <p className="text-xs text-muted-foreground">
                Opcional. O horário será interpretado no fuso local do navegador.
              </p>
              <FieldError message={errors.expiresAt?.message} />
            </div>

            <div className="space-y-2">
              <Label>Status *</Label>

              <Controller
                name="status"
                control={control}
                render={({ field }) => {
                  const allStatusOptions = [
                    { value: "draft", label: "Rascunho" },
                    { value: "published", label: "Publicada" },
                    { value: "expired", label: "Expirada" },
                  ] as const;

                  const statusOptions = importId
                    ? allStatusOptions.filter((option) => option.value === "draft")
                    : allStatusOptions;
                  return (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                    >
                      <SelectTrigger className="w-full" aria-label="Status da oferta">
                        <SelectValue>
                          {statusOptions.find((option) => option.value === field.value)?.label}
                        </SelectValue>
                      </SelectTrigger>

                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />

              <p className="text-xs text-muted-foreground">
                Rascunhos não aparecem no site público.
              </p>
              <FieldError message={errors.status?.message} />
            </div>
          </FormSection>

          {saveDeal.isError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              Não foi possível salvar a oferta:{" "}
              {saveDeal.error instanceof Error ? saveDeal.error.message : "Tente novamente."}
            </div>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button
              className="h-10"
              nativeButton={false}
              type="button"
              variant="outline"
              disabled={saving}
              render={<Link to="/admin/ofertas" />}
            >
              Cancelar
            </Button>

            <Button
              className="h-10"
              type="submit"
              disabled={saving || (isEditing && !isDirty && !selectedImage)}
            >
              {saving ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {isEditing
                    ? "Salvar alterações"
                    : importId
                      ? "Criar rascunho"
                      : "Cadastrar oferta"}
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
