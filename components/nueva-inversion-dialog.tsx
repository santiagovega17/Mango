"use client";

import { useRef, useState, useTransition } from "react";
import { PlusCircle, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearInversion } from "@/lib/actions";

const TIPOS_ACTIVO = [
  "Acción",
  "CEDEAR",
  "Cripto",
  "FCI",
  "Bono",
  "Plazo Fijo",
  "Otro",
];

interface Props {
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm" | "lg";
}

export function NuevaInversionDialog({
  triggerVariant = "default",
  triggerSize = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("USD");
  const [tipoActivo, setTipoActivo] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("moneda", moneda);
    formData.set("tipo_activo", tipoActivo);

    startTransition(async () => {
      const result = await crearInversion(formData);
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setMoneda("USD");
        setTipoActivo("");
        setOpen(false);
      }
    });
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setError(null);
      setMoneda("USD");
      setTipoActivo("");
      formRef.current?.reset();
    }
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Nueva inversión
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Nueva inversión
          </DialogTitle>
          <DialogDescription>
            Agregá un activo a tu cartera para hacer seguimiento.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nombre del activo */}
          <div className="space-y-1.5">
            <Label htmlFor="nombre_activo">Nombre del activo</Label>
            <Input
              id="nombre_activo"
              name="nombre_activo"
              placeholder="ej: Bitcoin, AAPL, Plazo Fijo Banco X"
              required
              disabled={isPending}
            />
          </div>

          {/* Tipo de activo */}
          <div className="space-y-1.5">
            <Label>Tipo de activo</Label>
            <Select
              value={tipoActivo}
              onValueChange={setTipoActivo}
              required
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un tipo…" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ACTIVO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Moneda */}
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["ARS", "USD"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoneda(m)}
                  disabled={isPending}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    moneda === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {m === "ARS" ? "🇦🇷 ARS" : "🇺🇸 USD"}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad + Precio de compra */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                name="cantidad"
                type="number"
                min="0"
                step="any"
                placeholder="1"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="precio_compra">
                Precio de compra ({moneda})
              </Label>
              <Input
                id="precio_compra"
                name="precio_compra"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                required
                disabled={isPending}
              />
            </div>
          </div>

          {/* Precio actual (opcional) */}
          <div className="space-y-1.5">
            <Label htmlFor="precio_actual">
              Precio actual ({moneda}){" "}
              <span className="text-muted-foreground font-normal">
                — opcional
              </span>
            </Label>
            <Input
              id="precio_actual"
              name="precio_actual"
              type="number"
              min="0"
              step="any"
              placeholder="Podés actualizarlo después"
              disabled={isPending}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !tipoActivo}
              className="gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Guardando…" : "Guardar inversión"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
