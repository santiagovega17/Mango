"use client";

import { useState, useTransition, useRef } from "react";
import { PlusCircle, Wallet, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { crearCuenta } from "@/lib/actions";

const TIPOS_CUENTA = [
  { value: "banco", label: "🏦  Cuenta bancaria" },
  { value: "efectivo", label: "💵  Efectivo" },
  { value: "billetera_virtual", label: "📱  Billetera virtual" },
  { value: "tarjeta_credito", label: "💳  Tarjeta de crédito" },
  { value: "inversion", label: "📈  Cuenta de inversión" },
  { value: "otro", label: "🗂️  Otro" },
];

interface Props {
  /** Si se pasa, el botón disparador es controlado externamente */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Se llama tras crear la cuenta con éxito (antes de cerrar el diálogo). */
  onSuccess?: () => void;
  /** Personalización del trigger por defecto */
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}

export function NuevaCuentaDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  triggerLabel = "Nueva cuenta",
  triggerVariant = "outline",
  triggerSize = "sm",
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(value: boolean) {
    if (isControlled) controlledOnOpenChange?.(value);
    else setInternalOpen(value);
  }

  const [tipo, setTipo] = useState("");
  const [moneda, setMoneda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function resetForm() {
    formRef.current?.reset();
    setTipo("");
    setMoneda("");
    setError(null);
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    setOpen(val);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    // Inyectamos los valores del Select (no son inputs nativos)
    formData.set("tipo", tipo);
    formData.set("moneda", moneda);

    if (!tipo) { setError("Seleccioná el tipo de cuenta."); return; }
    if (!moneda) { setError("Seleccioná la moneda."); return; }

    startTransition(async () => {
      const result = await crearCuenta(formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("¡Cuenta creada con éxito!");
        onSuccess?.();
        handleOpenChange(false);
      }
    });
  }

  return (
    <>
      {/* Trigger por defecto (se omite si el diálogo es controlado externamente) */}
      {!isControlled && (
        <Button
          variant={triggerVariant}
          size={triggerSize}
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <Wallet className="h-4 w-4" />
          {triggerLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Nueva cuenta
            </DialogTitle>
            <DialogDescription>
              Registrá una cuenta bancaria, efectivo, billetera virtual u otro.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="cuenta-nombre" className="text-xs uppercase tracking-wider text-muted-foreground">
                Nombre
              </Label>
              <Input
                id="cuenta-nombre"
                name="nombre"
                placeholder="Ej: Cuenta Galicia, Efectivo, Uala…"
                required
                className="bg-secondary/50 border-border/80 h-11"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Tipo
              </Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-secondary/50 border-border/80 h-11">
                  <SelectValue placeholder="Seleccioná el tipo…" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CUENTA.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Moneda */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Moneda
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(["ARS", "USD"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMoneda(m)}
                    className={`h-11 rounded-lg border text-sm font-medium transition-all ${
                      moneda === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-muted-foreground hover:border-border/80 hover:bg-accent"
                    }`}
                  >
                    {m === "ARS" ? "🇦🇷  ARS" : "🇺🇸  USD"}
                  </button>
                ))}
              </div>
            </div>

            {/* Saldo inicial */}
            <div className="space-y-2">
              <Label htmlFor="cuenta-saldo" className="text-xs uppercase tracking-wider text-muted-foreground">
                Saldo inicial{" "}
                <span className="text-muted-foreground/60 normal-case">(opcional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60 pointer-events-none select-none">
                  {moneda || "$"}
                </span>
                <Input
                  id="cuenta-saldo"
                  name="saldo_inicial"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  defaultValue="0"
                  className="pl-12 bg-secondary/50 border-border/80 h-11"
                />
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Crear cuenta
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
