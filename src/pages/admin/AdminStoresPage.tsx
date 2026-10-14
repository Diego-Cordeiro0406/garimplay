import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, LoaderCircle, Pencil, Plus, RefreshCw, Store, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  defaultStoreFormValues,
  storeFormSchema,
  type StoreFormValues,
} from "@/schemas/store.schema";
import type { AdminStore } from "@/services/admin-stores";
import {
  useAdminStores,
  useCreateAdminStore,
  useUpdateAdminStore,
  useDeleteAdminStore,
} from "@/hooks/useAdminStores";

function StoreFormDialog({
  open,
  onOpenChange,
  store,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: AdminStore | null;
}) {
  const createStore = useCreateAdminStore();
  const updateStore = useUpdateAdminStore();
  const isEditing = Boolean(store);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: defaultStoreFormValues,
  });

  useEffect(() => {
    if (!open) return;

    reset(
      store
        ? {
            name: store.name,
            websiteUrl: store.websiteUrl ?? "",
            logoUrl: store.logoUrl ?? "",
          }
        : defaultStoreFormValues
    );

    createStore.reset();
    updateStore.reset();
    // Inicialização somente ao abrir ou trocar a loja.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, store, reset]);

  const saving = isSubmitting || createStore.isPending || updateStore.isPending;

  async function onSubmit(values: StoreFormValues) {
    try {
      if (store) {
        await updateStore.mutateAsync({
          id: store.id,
          values,
        });
      } else {
        await createStore.mutateAsync(values);
      }

      onOpenChange(false);
    } catch {
      // Erro exibido abaixo do formulário.
    }
  }

  const mutationError = createStore.error ?? updateStore.error;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar loja" : "Cadastrar loja"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da loja."
              : "Adicione uma loja para vinculá-la às ofertas."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="store-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="store-name">Nome da loja *</Label>
            <Input
              id="store-name"
              placeholder="Ex.: Amazon"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-website">Site oficial</Label>
            <Input
              id="store-website"
              type="url"
              placeholder="https://www.exemplo.com.br"
              aria-invalid={Boolean(errors.websiteUrl)}
              {...register("websiteUrl")}
            />
            {errors.websiteUrl && (
              <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-logo">URL do logotipo</Label>
            <Input
              id="store-logo"
              type="url"
              placeholder="https://www.exemplo.com.br/logo.png"
              aria-invalid={Boolean(errors.logoUrl)}
              {...register("logoUrl")}
            />
            {errors.logoUrl && <p className="text-xs text-destructive">{errors.logoUrl.message}</p>}
          </div>

          {mutationError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {mutationError.message || "Não foi possível salvar a loja."}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={saving || (isEditing && !isDirty)}>
              {saving && <LoaderCircle className="size-4 animate-spin" />}
              {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar loja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStoresPage() {
  const { data: stores = [], isPending, isError, refetch } = useAdminStores();

  const deleteStore = useDeleteAdminStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<AdminStore | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<AdminStore | null>(null);

  function openCreate() {
    setEditingStore(null);
    setFormOpen(true);
  }

  function openEdit(store: AdminStore) {
    setEditingStore(store);
    setFormOpen(true);
  }

  function openDelete(store: AdminStore) {
    deleteStore.reset();
    setStoreToDelete(store);
  }

  async function handleDelete() {
    if (!storeToDelete || deleteStore.isPending) return;

    try {
      await deleteStore.mutateAsync(storeToDelete.id);
      setStoreToDelete(null);
    } catch {
      // O diálogo permanece aberto para mostrar o erro.
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Administração
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Lojas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerencie as lojas disponíveis para as ofertas.
          </p>
        </div>

        <Button className="h-10" onClick={openCreate}>
          <Plus className="size-4" />
          Nova loja
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-destructive">Não foi possível carregar as lojas.</p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
            <RefreshCw className="size-4" />
            Tentar novamente
          </Button>
        </div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-14 text-center">
          <Store className="mb-4 size-10 text-muted-foreground" />
          <h2 className="font-semibold">Nenhuma loja cadastrada</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Cadastre sua primeira loja para começar a vinculá-la às ofertas.
          </p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="size-4" />
            Cadastrar loja
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {stores.length} {stores.length === 1 ? "loja cadastrada" : "lojas cadastradas"}
          </p>

          {stores.map((store) => (
            <div
              key={store.id}
              className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-secondary">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt="" className="size-full object-contain p-1" />
                  ) : (
                    <Store className="size-5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate font-medium">{store.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {store.dealsCount}{" "}
                    {store.dealsCount === 1 ? "oferta vinculada" : "ofertas vinculadas"}
                  </p>

                  {store.websiteUrl && (
                    <a
                      href={store.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Visitar site
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                <Button variant="outline" size="lg" onClick={() => openEdit(store)}>
                  <Pencil className="size-4" />
                  Editar
                </Button>

                <Button
                  variant="outline"
                  className="h-10"
                  disabled={store.dealsCount > 0}
                  title={
                    store.dealsCount > 0 ? "Esta loja possui ofertas vinculadas" : "Excluir loja"
                  }
                  aria-label={`Excluir ${store.name}`}
                  onClick={() => openDelete(store)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <StoreFormDialog open={formOpen} onOpenChange={setFormOpen} store={editingStore} />

      <AlertDialog
        open={storeToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteStore.isPending) {
            setStoreToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente a loja{" "}
              <span className="font-semibold text-foreground">{storeToDelete?.name}</span>. Esta
              ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteStore.isError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteStore.error.message}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStore.isPending}>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              variant="destructive"
              disabled={deleteStore.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteStore.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Excluir loja
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
