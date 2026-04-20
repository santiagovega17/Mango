"use client";

import { useRef, useState, useTransition, useMemo, useEffect } from "react";
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
import {
  crearInversion,
  obtenerActivosInversionAction,
  obtenerCuentasAction,
} from "@/lib/actions";
import { parseFormDecimal } from "@/lib/form-numbers";
import { esCuentaBrokerInversion } from "@/lib/cuenta-tipo";
import type { CuentaResumen } from "@/lib/data";
import Link from "next/link";

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
  const [nombreActivo, setNombreActivo] = useState("");
  const [tipoActivo, setTipoActivo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [montoCompraTotal, setMontoCompraTotal] = useState("");
  const [montoActualTotal, setMontoActualTotal] = useState("");
  const [cuentas, setCuentas] = useState<CuentaResumen[]>([]);
  const [activos, setActivos] = useState<
    {
      id: string;
      nombre_activo: string;
      tipo_activo: string;
      cuenta_id: string | null;
      moneda: "ARS" | "USD";
    }[]
  >([]);
  const [activoExistenteId, setActivoExistenteId] = useState("new");
  const [cuentaBrokerId, setCuentaBrokerId] = useState("");
  const [fechaOperacion, setFechaOperacion] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tasaAnual, setTasaAnual] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const brokersEnMoneda = useMemo(
    () =>
      cuentas.filter(
        (c) => esCuentaBrokerInversion(c.tipo) && c.moneda === moneda
      ),
    [cuentas, moneda]
  );

  useEffect(() => {
    if (!open) return;
    setLoadingCuentas(true);
    Promise.all([obtenerCuentasAction(), obtenerActivosInversionAction()])
      .then(([cuentasRes, activosRes]) => {
        setCuentas(cuentasRes);
        setActivos(activosRes);
      })
      .finally(() => setLoadingCuentas(false));
  }, [open]);

  useEffect(() => {
    if (brokersEnMoneda.length === 0) {
      setCuentaBrokerId("");
      return;
    }
    setCuentaBrokerId((prev) =>
      brokersEnMoneda.some((b) => b.id === prev)
        ? prev
        : brokersEnMoneda[0].id
    );
  }, [brokersEnMoneda]);

  const activosExistentes = useMemo(
    () =>
      activos.filter(
        (a) => a.moneda === moneda && a.cuenta_id === cuentaBrokerId
      ),
    [activos, moneda, cuentaBrokerId]
  );

  useEffect(() => {
    if (activoExistenteId === "new") return;
    if (!activosExistentes.some((a) => a.id === activoExistenteId)) {
      setActivoExistenteId("new");
      setNombreActivo("");
      setTipoActivo("");
    }
  }, [activosExistentes, activoExistenteId]);

  useEffect(() => {
    if (activoExistenteId === "new") return;
    const activo = activos.find((a) => a.id === activoExistenteId);
    if (!activo) return;
    if (cuentaBrokerId && activo.cuenta_id !== cuentaBrokerId) return;
    setNombreActivo(activo.nombre_activo);
    setTipoActivo(activo.tipo_activo);
    if (activo.tipo_activo === "Plazo Fijo") {
      setCantidad("1");
    }
    if (activo.tipo_activo !== "Plazo Fijo") {
      setTasaAnual("");
      setFechaVencimiento("");
    }
  }, [activoExistenteId, activos, cuentaBrokerId]);

  useEffect(() => {
    if (tipoActivo !== "Plazo Fijo") {
      setTasaAnual("");
      setFechaVencimiento("");
    } else {
      setCantidad("1");
      setMontoActualTotal("");
    }
  }, [tipoActivo]);

  // Precios unitarios calculados en tiempo real
  const { precioUnitarioCompra, precioUnitarioActual } = useMemo(() => {
    const q = parseFormDecimal(cantidad);
    const valido = q > 0;
    const tc = parseFormDecimal(montoCompraTotal);
    const ta = parseFormDecimal(montoActualTotal);
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

    if (!cuentaBrokerId) {
      setError("Seleccioná la cuenta broker donde está la posición.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("moneda", moneda);
    formData.set("nombre_activo", nombreActivo);
    formData.set("tipo_activo", tipoActivo);
    formData.set("cuenta_id", cuentaBrokerId);
    formData.set("fecha_operacion", fechaOperacion);
    if (activoExistenteId !== "new") {
      formData.set("inversion_id", activoExistenteId);
    } else {
      formData.delete("inversion_id");
    }
    if (tipoActivo === "Plazo Fijo") {
      formData.set("tasa_anual", tasaAnual);
      formData.set("fecha_vencimiento", fechaVencimiento);
    } else {
      formData.delete("tasa_anual");
      formData.delete("fecha_vencimiento");
    }
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
        setNombreActivo("");
        setTipoActivo("");
        setCantidad("");
        setMontoCompraTotal("");
        setMontoActualTotal("");
        setCuentaBrokerId("");
        setActivoExistenteId("new");
        setFechaOperacion(new Date().toISOString().slice(0, 10));
        setTasaAnual("");
        setFechaVencimiento("");
        setOpen(false);
      }
    });
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setError(null);
      setMoneda("USD");
      setNombreActivo("");
      setTipoActivo("");
      setCantidad("");
      setMontoCompraTotal("");
      setMontoActualTotal("");
      setCuentaBrokerId("");
      setActivoExistenteId("new");
      setFechaOperacion(new Date().toISOString().slice(0, 10));
      setTasaAnual("");
      setFechaVencimiento("");
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
            Agregá un activo vinculado a una cuenta broker (tipo inversión).
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Moneda primero (filtra brokers) */}
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

          {/* Cuenta broker */}
          <div className="space-y-1.5">
            <Label>Cuenta broker</Label>
            {loadingCuentas ? (
              <p className="text-xs text-muted-foreground">Cargando cuentas…</p>
            ) : brokersEnMoneda.length === 0 ? (
              <Alert className="py-2">
                <AlertDescription className="text-xs">
                  No tenés una cuenta tipo{" "}
                  <strong className="text-foreground">Cuenta de inversión</strong>{" "}
                  en {moneda}. Creala en{" "}
                  <Link
                    href="/configuracion"
                    className="text-primary underline underline-offset-2"
                  >
                    Configuración
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={cuentaBrokerId}
                onValueChange={setCuentaBrokerId}
                disabled={isPending}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí el broker" />
                </SelectTrigger>
                <SelectContent>
                  {brokersEnMoneda.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Recompra de activo existente */}
          <div className="space-y-1.5">
            <Label>Activo existente (opcional)</Label>
            <Select
              value={activoExistenteId}
              onValueChange={setActivoExistenteId}
              disabled={isPending || !cuentaBrokerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Crear activo nuevo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Crear activo nuevo</SelectItem>
                {activosExistentes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre_activo} ({a.tipo_activo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activoExistenteId !== "new" && (
              <p className="text-[11px] text-muted-foreground">
                Se sumará esta compra al activo elegido y se recalculará el
                precio promedio de compra.
              </p>
            )}
          </div>

          {/* Nombre del activo */}
          <div className="space-y-1.5">
            <Label htmlFor="nombre_activo">Nombre del activo</Label>
            <Input
              id="nombre_activo"
              name="nombre_activo"
              placeholder="ej: Bitcoin, AAPL, Plazo Fijo Banco X"
              required
              disabled={isPending || activoExistenteId !== "new"}
              value={nombreActivo}
              onChange={(e) => setNombreActivo(e.target.value)}
            />
          </div>

          {/* Tipo de activo */}
          <div className="space-y-1.5">
            <Label>Tipo de activo</Label>
            <Select
              value={tipoActivo}
              onValueChange={setTipoActivo}
              required
              disabled={isPending || activoExistenteId !== "new"}
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

          <div className="space-y-1.5">
            <Label htmlFor="fecha_operacion">Fecha de operación</Label>
            <Input
              id="fecha_operacion"
              name="fecha_operacion"
              type="date"
              value={fechaOperacion}
              onChange={(e) => setFechaOperacion(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          {tipoActivo === "Plazo Fijo" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tasa_anual">Tasa anual (%)</Label>
                <Input
                  id="tasa_anual"
                  name="tasa_anual"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={tasaAnual}
                  onChange={(e) => setTasaAnual(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fecha_vencimiento">Vencimiento</Label>
                <Input
                  id="fecha_vencimiento"
                  name="fecha_vencimiento"
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
            </div>
          )}

          {/* Cantidad (divisor compartido) */}
          {tipoActivo !== "Plazo Fijo" ? (
            <div className="space-y-1.5">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                name="cantidad"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="1"
                required
                disabled={isPending}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
          ) : (
            <input type="hidden" name="cantidad" value="1" />
          )}

          {/* Monto total invertido + Valor total actual */}
          <div
            className={`grid gap-3 ${
              tipoActivo === "Plazo Fijo" ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
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
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  required
                  disabled={isPending}
                  value={montoCompraTotal}
                  onChange={(e) => setMontoCompraTotal(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {tipoActivo !== "Plazo Fijo" ? (
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
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    placeholder="Podés actualizarlo después"
                    disabled={isPending}
                    value={montoActualTotal}
                    onChange={(e) => setMontoActualTotal(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            ) : (
              <input type="hidden" name="monto_actual_total" value="" />
            )}
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

            {tipoActivo !== "Plazo Fijo" && (
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
            )}

            {tipoActivo !== "Plazo Fijo" && precioUnitarioCompra && precioUnitarioActual && (
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
              disabled={
                isPending ||
                !nombreActivo.trim() ||
                !tipoActivo ||
                !cuentaBrokerId ||
                (tipoActivo === "Plazo Fijo" &&
                  (!tasaAnual.trim() || !fechaVencimiento.trim())) ||
                brokersEnMoneda.length === 0
              }
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
