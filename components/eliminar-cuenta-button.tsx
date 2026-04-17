"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { eliminarCuenta } from "@/lib/actions";

interface Props {
  cuentaId: string;
  cuentaNombre: string;
}

export function EliminarCuentaButton({ cuentaId, cuentaNombre }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await eliminarCuenta(cuentaId);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(`Cuenta "${cuentaNombre}" eliminada.`);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
        title="Eliminar cuenta"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Eliminar cuenta
            </DialogTitle>
            <DialogDescription className="pt-1">
              ¿Estás seguro de que querés eliminar{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{cuentaNombre}&rdquo;
              </span>
              ? Esta acción también eliminará todas las transacciones asociadas
              y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Sí, eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
