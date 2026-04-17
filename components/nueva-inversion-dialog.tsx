"use client";

import { useRef, useState, useTransition, useMemo } from "react";
import { PlusCircle, Loader2, TrendingUp, Calculator } from "lucide-react";
import { toast } from "sonner";
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
  const [cantidad, setCantidad] = useState("");
  const [montoCompraTotal, setMontoCompraTotal] = useState("");
  const [montoActualTotal, setMontoActualTotal] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Precios unitarios calculados en tiempo real
  const { precioUnitarioCompra, precioUnitarioActual } = useMemo(() => {
    const q = parseFloat(cantidad);
    const valido = q > 0;
    const tc = parseFloat(montoCompraTotal);
    const ta = parseFloat(montoActualTotal);
    return {
      precioUnitarioCompra: valido && tc > 0 ? tc / q : null,
      precioUnitarioActual: valido && ta > 0 ? ta / q : null,
    };
  }, [cantidad, montoCompraTotal, montoActualTotal]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!precioUnitarioCompra || precioUnitarioCompra <= 0) {
      setError("Ingresá una cantidad y un monto total invertido válidos.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("moneda", moneda);
    formData.set("tipo_activo", tipoActivo);
    // Persistir precios unitarios, no los totales
    formData.set("precio_compra", String(precioUnitarioCompra));
    if (precioUnitarioActual) {
      formData.set("precio_actual", String(precioUnitarioActual));
    } else {
      formData.delete("precio_actual");
    }

    startTransition(async () => {
      const result = await crearInversion(formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Inversión guardada en la cartera.");
        formRef.current?.reset();
        setMoneda("USD");
        setTipoActivo("");
        setCantidad("");
        setMontoCompraTotal("");
        setMontoActualTotal("");
        setOpen(false);
      }
    });
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setError(null);
      setMoneda("USD");
      setTipoActivo("");
      setCantidad("");
      setMontoCompraTotal("");
      setMontoActualTotal("");
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

          {/* Cantidad (divisor compartido) */}
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
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>

          {/* Monto total invertido + Valor total actual */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="monto_compra_total">
                Monto total invertido ({moneda})
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground/60">
                  {moneda === "ARS" ? "$" : "u$s"}
                </span>
                <Input
                  id="monto_compra_total"
                  name="monto_compra_total"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  required
                  disabled={isPending}
                  value={montoCompraTotal}
                  onChange={(e) => setMontoCompraTotal(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monto_actual_total">
                Valor total actual ({moneda}){" "}
                <span className="text-muted-foreground font-normal text-xs">— opcional</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground/60">
                  {moneda === "ARS" ? "$" : "u$s"}
                </span>
                <Input
                  id="monto_actual_total"
                  name="monto_actual_total"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Podés actualizarlo después"
                  disabled={isPending}
                  value={montoActualTotal}
                  onChange={(e) => setMontoActualTotal(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Panel de precios unitarios calculados */}
          <div className="rounded-lg border border-border/40 bg-secondary/30 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Precios unitarios calculados
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Precio de compra:</span>
              <span
                className={`font-mono text-sm font-semibold ${
                  precioUnitarioCompra ? "text-primary" : "text-muted-foreground/40"
                }`}
              >
                {precioUnitarioCompra
                  ? `${moneda === "ARS" ? "$" : "u$s"} ${precioUnitarioCompra.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}`
                  : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Precio actual:</span>
              <span
                className={`font-mono text-sm font-semibold ${
                  precioUnitarioActual
                    ? precioUnitarioActual >= (precioUnitarioCompra ?? 0)
                      ? "text-emerald-400"
                      : "text-red-400"
                    : "text-muted-foreground/40"
                }`}
              >
                {precioUnitarioActual
                  ? `${moneda === "ARS" ? "$" : "u$s"} ${precioUnitarioActual.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}`
                  : "—"}
              </span>
            </div>

            {precioUnitarioCompra && precioUnitarioActual && (
              <div className="flex items-center justify-between border-t border-border/30 pt-1.5 mt-1">
                <span className="text-xs text-muted-foreground">Rendimiento estimado:</span>
                <span
                  className={`text-xs font-semibold ${
                    precioUnitarioActual >= precioUnitarioCompra
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {precioUnitarioActual >= precioUnitarioCompra ? "+" : ""}
                  {(((precioUnitarioActual - precioUnitarioCompra) / precioUnitarioCompra) * 100).toFixed(2)}%
                </span>
              </div>
            )}
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
