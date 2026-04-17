"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeftRight,
  ArrowDown,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Repeat2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { crearTransferencia, obtenerCuentasAction } from "@/lib/actions";
import type { CuentaResumen } from "@/lib/data";

interface Props {
  cuentasIniciales?: CuentaResumen[];
  compact?: boolean;
}

export function NuevaTransferenciaDialog({
  cuentasIniciales,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cuentaOrigenId, setCuentaOrigenId] = useState("");
  const [cuentaDestinoId, setCuentaDestinoId] = useState("");
  // Montos controlados para poder sincronizarlos en modo misma moneda
  const [montoOrigen, setMontoOrigen] = useState("");
  const [montoDestino, setMontoDestino] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const [cuentas, setCuentas] = useState<CuentaResumen[]>(cuentasIniciales ?? []);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const cuentasCargadas = useRef(!!cuentasIniciales?.length);

  // ── Derivados de las cuentas seleccionadas ───────────────────────────────

  const cuentaOrigen = useMemo(
    () => cuentas.find((c) => c.id === cuentaOrigenId),
    [cuentas, cuentaOrigenId]
  );
  const cuentaDestino = useMemo(
    () => cuentas.find((c) => c.id === cuentaDestinoId),
    [cuentas, cuentaDestinoId]
  );

  const monedaOrigen = cuentaOrigen?.moneda ?? "ARS";
  const monedaDestino = cuentaDestino?.moneda ?? "ARS";
  const esMultimoneda =
    !!cuentaOrigen && !!cuentaDestino && monedaOrigen !== monedaDestino;

  // Descripción sugerida según el tipo de operación
  const descripcionSugerida = esMultimoneda
    ? monedaOrigen === "ARS"
      ? "Compra de USD"
      : "Venta de USD"
    : "Transferencia";

  // ── Carga de cuentas ─────────────────────────────────────────────────────

  useEffect(() => {
    if (open && !cuentasCargadas.current) {
      setLoadingCuentas(true);
      obtenerCuentasAction().then((data) => {
        setCuentas(data);
        cuentasCargadas.current = true;
        if (data.length > 0) setCuentaOrigenId(data[0].id);
        if (data.length > 1) setCuentaDestinoId(data[1].id);
        setLoadingCuentas(false);
      });
    } else if (open && cuentas.length >= 2) {
      if (!cuentaOrigenId) setCuentaOrigenId(cuentas[0].id);
      if (!cuentaDestinoId) setCuentaDestinoId(cuentas[1].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Reset ────────────────────────────────────────────────────────────────

  function resetForm() {
    formRef.current?.reset();
    setCuentaOrigenId(cuentas[0]?.id ?? "");
    setCuentaDestinoId(cuentas[1]?.id ?? "");
    setMontoOrigen("");
    setMontoDestino("");
    setError(null);
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    setOpen(val);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!cuentaOrigenId || !cuentaDestinoId) {
      setError("Seleccioná ambas cuentas.");
      return;
    }
    if (cuentaOrigenId === cuentaDestinoId) {
      setError("La cuenta origen y destino no pueden ser la misma.");
      return;
    }

    const mO = parseFloat(montoOrigen);
    const mD = parseFloat(montoDestino);

    if (isNaN(mO) || mO <= 0) {
      setError(`Ingresá un monto válido a retirar en ${monedaOrigen}.`);
      return;
    }
    if (esMultimoneda && (isNaN(mD) || mD <= 0)) {
      setError(`Ingresá un monto válido a depositar en ${monedaDestino}.`);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("cuenta_origen_id", cuentaOrigenId);
    formData.set("cuenta_destino_id", cuentaDestinoId);
    formData.set("moneda_origen", monedaOrigen);
    formData.set("moneda_destino", monedaDestino);
    formData.set("monto_origen", String(mO));
    // En misma moneda, el destino recibe el mismo monto
    formData.set("monto_destino", esMultimoneda ? String(mD) : String(mO));

    startTransition(async () => {
      const result = await crearTransferencia(formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(
          esMultimoneda ? "¡Conversión registrada!" : "¡Transferencia registrada!"
        );
        handleOpenChange(false);
      }
    });
  }

  // ── Intercambiar cuentas ─────────────────────────────────────────────────

  function swapCuentas() {
    const tmpId = cuentaOrigenId;
    const tmpMonto = montoOrigen;
    setCuentaOrigenId(cuentaDestinoId);
    setCuentaDestinoId(tmpId);
    setMontoOrigen(montoDestino);
    setMontoDestino(tmpMonto);
  }

  const hoy = new Date().toISOString().split("T")[0];
  const cuentasDisponibles = cuentas.length >= 2;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Button
        variant="outline"
        size={compact ? "icon" : "sm"}
        className="gap-2 shrink-0"
        onClick={() => setOpen(true)}
      >
        <ArrowLeftRight className="h-4 w-4" />
        {!compact && "Transferencia"}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-sky-400" />
              {esMultimoneda ? "Conversión de divisas" : "Nueva transferencia"}
            </DialogTitle>
            <DialogDescription>
              {esMultimoneda
                ? "Operación de cambio entre cuentas de distinta moneda."
                : "Mové fondos entre tus cuentas. El saldo total no cambia."}
            </DialogDescription>
          </DialogHeader>

          {/* Chip de modo */}
          {cuentaOrigen && cuentaDestino && (
            <div className="flex items-center gap-2">
              {esMultimoneda ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs"
                >
                  <Repeat2 className="h-3 w-3" />
                  Cambio {monedaOrigen} → {monedaDestino}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-sky-500/40 bg-sky-500/10 text-sky-400 text-xs"
                >
                  <ArrowRight className="h-3 w-3" />
                  Transferencia {monedaOrigen}
                </Badge>
              )}
            </div>
          )}

          {!loadingCuentas && !cuentasDisponibles && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Necesitás al menos <strong>2 cuentas</strong> para hacer una
                transferencia.
              </AlertDescription>
            </Alert>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 mt-1">

            {/* ── Selector de cuentas ────────────────────────────────── */}
            <div className="relative grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              {/* Cuenta origen */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Desde
                  </Label>
                  {loadingCuentas && (
                    <RefreshCw className="h-3 w-3 text-muted-foreground animate-spin" />
                  )}
                </div>
                <Select
                  value={cuentaOrigenId}
                  onValueChange={setCuentaOrigenId}
                  disabled={loadingCuentas || cuentas.length === 0}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/80 h-10">
                    <SelectValue placeholder="Cuenta origen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentas.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        disabled={c.id === cuentaDestinoId}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                            {c.moneda}
                          </span>
                          {c.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botón swap */}
              <button
                type="button"
                onClick={swapCuentas}
                disabled={!cuentasDisponibles || isPending}
                className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                title="Intercambiar cuentas"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>

              {/* Cuenta destino */}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Hacia
                </Label>
                <Select
                  value={cuentaDestinoId}
                  onValueChange={setCuentaDestinoId}
                  disabled={loadingCuentas || cuentas.length === 0}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/80 h-10">
                    <SelectValue placeholder="Cuenta destino…" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentas.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        disabled={c.id === cuentaOrigenId}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                            {c.moneda}
                          </span>
                          {c.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Sección de montos ──────────────────────────────────── */}
            {esMultimoneda ? (
              /* MULTIMONEDA: dos inputs en paralelo */
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Repeat2 className="h-3.5 w-3.5" />
                  Tipo de cambio manual
                </p>

                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  {/* Monto origen */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Retirás ({monedaOrigen})
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground/60">
                        {monedaOrigen === "ARS" ? "$" : "u$s"}
                      </span>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={montoOrigen}
                        onChange={(e) => setMontoOrigen(e.target.value)}
                        className="pl-8 bg-secondary/50 border-border/80 h-11 text-base font-mono"
                        disabled={isPending}
                        required
                      />
                    </div>
                  </div>

                  {/* Ícono de conversión */}
                  <div className="mb-0.5 flex h-11 w-8 items-center justify-center">
                    <div className="flex flex-col items-center gap-0.5 text-amber-400/60">
                      <ArrowDown className="h-3 w-3 -rotate-45" />
                      <ArrowDown className="h-3 w-3 rotate-135" />
                    </div>
                  </div>

                  {/* Monto destino */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Depositás ({monedaDestino})
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground/60">
                        {monedaDestino === "ARS" ? "$" : "u$s"}
                      </span>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={montoDestino}
                        onChange={(e) => setMontoDestino(e.target.value)}
                        className="pl-8 bg-secondary/50 border-border/80 h-11 text-base font-mono"
                        disabled={isPending}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Tipo de cambio implícito */}
                {montoOrigen && montoDestino && parseFloat(montoOrigen) > 0 && parseFloat(montoDestino) > 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Tipo de cambio implícito:{" "}
                    <strong className="text-amber-400">
                      {monedaOrigen === "ARS"
                        ? `1 USD = $ ${(parseFloat(montoOrigen) / parseFloat(montoDestino)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `1 USD = $ ${(parseFloat(montoDestino) / parseFloat(montoOrigen)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </strong>
                  </p>
                )}
              </div>
            ) : (
              /* MISMA MONEDA: un solo input */
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Monto{cuentaOrigen ? ` (${monedaOrigen})` : ""}
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground/60">
                    {monedaOrigen === "ARS" ? "$" : "u$s"}
                  </span>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={montoOrigen}
                    onChange={(e) => {
                      setMontoOrigen(e.target.value);
                      setMontoDestino(e.target.value); // sincronizar
                    }}
                    className="pl-8 bg-secondary/50 border-border/80 h-11 text-lg font-mono"
                    disabled={isPending}
                    required
                  />
                </div>
              </div>
            )}

            {/* ── Descripción ─────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Descripción{" "}
                <span className="text-muted-foreground/60 normal-case">(opcional)</span>
              </Label>
              <Input
                name="descripcion"
                defaultValue={descripcionSugerida}
                key={descripcionSugerida} // re-render al cambiar el tipo
                className="bg-secondary/50 border-border/80 h-11"
                disabled={isPending}
              />
            </div>

            {/* ── Fecha ───────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Fecha
              </Label>
              <Input
                name="fecha"
                type="date"
                defaultValue={hoy}
                required
                className="bg-secondary/50 border-border/80 h-11"
                disabled={isPending}
              />
            </div>

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
              <Button
                type="submit"
                disabled={isPending || !cuentasDisponibles}
                className={`gap-2 ${
                  esMultimoneda
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : esMultimoneda ? (
                  <>
                    <Repeat2 className="h-4 w-4" />
                    Confirmar conversión
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="h-4 w-4" />
                    Confirmar transferencia
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
