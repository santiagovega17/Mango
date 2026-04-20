"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Trash2,
  Pencil,
  Loader2,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Coins,
  Building2,
  Bitcoin,
  Landmark,
  HelpCircle,
  RefreshCw,
  Wallet,
  ListOrdered,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { NuevaInversionDialog } from "@/components/nueva-inversion-dialog";
import {
  eliminarInversion,
  actualizarPrecioActual,
  venderInversion,
} from "@/lib/actions";
import { parseFormDecimal } from "@/lib/form-numbers";
import type {
  InversionItem,
  CotizacionDolar,
  CarteraPorBroker,
} from "@/lib/data";

// ── Helpers de tipo activo ────────────────────────────────────────────────────

const TIPO_META: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  Acción: { icon: BarChart3, color: "text-blue-400", bg: "bg-blue-400/10" },
  CEDEAR: { icon: Building2, color: "text-violet-400", bg: "bg-violet-400/10" },
  Cripto: { icon: Bitcoin, color: "text-amber-400", bg: "bg-amber-400/10" },
  FCI: { icon: Coins, color: "text-purple-400", bg: "bg-purple-400/10" },
  Bono: { icon: Landmark, color: "text-sky-400", bg: "bg-sky-400/10" },
  "Plazo Fijo": {
    icon: DollarSign,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  Otro: { icon: HelpCircle, color: "text-muted-foreground", bg: "bg-secondary" },
};

function getTipoMeta(tipo: string) {
  return TIPO_META[tipo] ?? TIPO_META["Otro"];
}

// ── Cálculos ──────────────────────────────────────────────────────────────────

function calcRendimiento(precioCompra: number, precioActual: number | null) {
  if (precioActual === null || precioCompra === 0) return null;
  return ((precioActual - precioCompra) / precioCompra) * 100;
}

function FilaInversion({
  inv,
  blueVenta,
  onEdit,
  onDeleteRequest,
  onViewDetail,
  onSellRequest,
  showBrokerLine,
}: {
  inv: InversionItem;
  blueVenta: number | null;
  onEdit: (i: InversionItem) => void;
  onDeleteRequest: (i: InversionItem) => void;
  onViewDetail: (i: InversionItem) => void;
  onSellRequest: (i: InversionItem) => void;
  showBrokerLine: boolean;
}) {
  const meta = getTipoMeta(inv.tipo_activo);
  const Icon = meta.icon;
  const valorInvertido = inv.cantidad * inv.precio_compra;
  const valorActual =
    inv.cantidad * (inv.precio_actual ?? inv.precio_compra);
  const rendimiento = calcRendimiento(inv.precio_compra, inv.precio_actual);
  const ganancia =
    inv.precio_actual !== null ? valorActual - valorInvertido : null;

  return (
    <div className="rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors p-4 group">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 mt-0.5",
            meta.bg
          )}
        >
          <Icon className={cn("h-5 w-5", meta.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground leading-tight">
              {inv.nombre_activo}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {inv.tipo_activo}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              {inv.moneda}
            </Badge>
            {inv.estado !== "activa" && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  inv.estado === "vendida"
                    ? "border-rose-400/40 text-rose-300"
                    : "border-amber-400/40 text-amber-300"
                )}
              >
                {inv.estado === "vendida" ? "Vendida" : "Vencida"}
              </Badge>
            )}
          </div>
          {showBrokerLine && (
            <p className="text-xs text-muted-foreground mt-1">
              Broker:{" "}
              <span className="text-foreground/90 font-medium">
                {inv.cuenta_nombre ?? "Sin asignar"}
              </span>
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Cantidad</p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {inv.cantidad.toLocaleString("es-AR", {
                  maximumFractionDigits: 8,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Precio promedio compra</p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {formatCurrency(inv.precio_compra, inv.moneda)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total invertido</p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {formatCurrency(valorInvertido, inv.moneda)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor actual</p>
              {inv.precio_actual !== null ? (
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    rendimiento !== null && rendimiento >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  )}
                >
                  {formatCurrency(valorActual, inv.moneda)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => onEdit(inv)}
                  className="text-xs text-muted-foreground/60 hover:text-primary transition-colors underline underline-offset-2"
                >
                  Actualizar precio
                </button>
              )}
            </div>
          </div>

          {rendimiento !== null && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <div
                className={cn(
                  "flex items-center gap-1.5 text-sm font-semibold",
                  rendimiento >= 0 ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {rendimiento >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {rendimiento >= 0 ? "+" : ""}
                {rendimiento.toFixed(2)}%
              </div>
              {ganancia !== null && (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    ganancia >= 0 ? "text-emerald-400/70" : "text-rose-400/70"
                  )}
                >
                  ({ganancia >= 0 ? "+" : ""}
                  {formatCurrency(ganancia, inv.moneda)})
                </span>
              )}
              {blueVenta && inv.moneda === "USD" && ganancia !== null && (
                <span className="text-xs text-muted-foreground/50">
                  ≈ {formatCurrency(ganancia * blueVenta, "ARS")} en ARS
                </span>
              )}
            </div>
          )}
          {inv.tipo_activo === "Plazo Fijo" && (
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Tasa anual:{" "}
                <strong className="text-foreground">
                  {inv.tasa_anual != null
                    ? `${inv.tasa_anual.toLocaleString("es-AR", {
                        maximumFractionDigits: 2,
                      })}%`
                    : "—"}
                </strong>
              </span>
              <span>
                Vencimiento:{" "}
                <strong className="text-foreground">
                  {inv.fecha_vencimiento
                    ? new Intl.DateTimeFormat("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }).format(new Date(`${inv.fecha_vencimiento}T12:00:00`))
                    : "—"}
                </strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onViewDetail(inv)}
            title="Ver detalle de compras"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(inv)}
            title="Actualizar precio"
            disabled={inv.estado !== "activa"}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {inv.estado === "activa" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-emerald-400"
              onClick={() => onSellRequest(inv)}
              title="Vender activo"
            >
              <DollarSign className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-rose-400"
            onClick={() => onDeleteRequest(inv)}
            title="Eliminar inversión"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  brokers: CarteraPorBroker[];
  sinBroker: InversionItem[];
  cerradas: InversionItem[];
  dolarBlue: CotizacionDolar | null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function InversionesCartera({
  brokers,
  sinBroker,
  cerradas,
  dolarBlue,
}: Props) {
  const [editTarget, setEditTarget] = useState<InversionItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<InversionItem | null>(null);
  const [sellTarget, setSellTarget] = useState<InversionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InversionItem | null>(null);
  const [isPendingDelete, startDelete] = useTransition();
  const [isPendingEdit, startEdit] = useTransition();
  const [isPendingSell, startSell] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const blueVenta = dolarBlue?.venta ?? null;

  const todasInversiones = useMemo(
    () => [...sinBroker, ...brokers.flatMap((b) => b.inversiones)],
    [brokers, sinBroker]
  );

  // ── Totales de cartera ────────────────────────────────────────────────────

  const totalInvertidoARS = todasInversiones
    .filter((i) => i.moneda === "ARS")
    .reduce((acc, i) => acc + i.cantidad * i.precio_compra, 0);
  const totalInvertidoUSD = todasInversiones
    .filter((i) => i.moneda === "USD")
    .reduce((acc, i) => acc + i.cantidad * i.precio_compra, 0);

  const totalActualARS = todasInversiones
    .filter((i) => i.moneda === "ARS")
    .reduce(
      (acc, i) => acc + i.cantidad * (i.precio_actual ?? i.precio_compra),
      0
    );
  const totalActualUSD = todasInversiones
    .filter((i) => i.moneda === "USD")
    .reduce(
      (acc, i) => acc + i.cantidad * (i.precio_actual ?? i.precio_compra),
      0
    );

  // Valor unificado en ARS usando dólar blue (solo si tenemos cotización)
  const totalInvertidoUnif =
    blueVenta !== null
      ? totalInvertidoARS + totalInvertidoUSD * blueVenta
      : null;
  const totalActualUnif =
    blueVenta !== null
      ? totalActualARS + totalActualUSD * blueVenta
      : null;

  const rendimientoGlobal =
    totalInvertidoUnif && totalActualUnif && totalInvertidoUnif > 0
      ? ((totalActualUnif - totalInvertidoUnif) / totalInvertidoUnif) * 100
      : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startDelete(async () => {
      const res = await eliminarInversion(deleteTarget.id);
      if (res.error) {
        setDeleteError(res.error);
        toast.error(res.error);
      } else {
        toast.success(`"${deleteTarget.nombre_activo}" eliminado de la cartera.`);
        setDeleteTarget(null);
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("inversion_id", editTarget.id);
    const precioRaw = ((formData.get("precio_actual") as string) ?? "").trim();
    if (precioRaw !== "") {
      const precioVal = parseFormDecimal(precioRaw);
      if (isNaN(precioVal) || precioVal < 0) {
        setEditError("Ingresá un precio válido (mayor o igual a 0).");
        return;
      }
      formData.set("precio_actual", String(precioVal));
    }
    startEdit(async () => {
      const res = await actualizarPrecioActual(formData);
      if (res.error) {
        setEditError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Precio actualizado.");
        setEditTarget(null);
      }
    });
  }

  function handleSellSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sellTarget) return;
    setSellError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("inversion_id", sellTarget.id);
    const precioRaw = ((formData.get("precio_venta") as string) ?? "").trim();
    const precioVal = parseFormDecimal(precioRaw);
    if (isNaN(precioVal) || precioVal <= 0) {
      setSellError("Ingresá un precio de venta válido.");
      return;
    }
    formData.set("precio_venta", String(precioVal));
    startSell(async () => {
      const res = await venderInversion(formData);
      if (res.error) {
        setSellError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Activo vendido y acreditado en la cuenta broker.");
        setSellTarget(null);
      }
    });
  }

  // ── Render vacío ──────────────────────────────────────────────────────────

  if (brokers.length === 0 && sinBroker.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center rounded-xl border-2 border-dashed border-border">
        <TrendingUp className="h-12 w-12 text-muted-foreground/20" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Tu cartera está vacía
          </p>
        </div>
        <NuevaInversionDialog />
      </div>
    );
  }

  return (
    <>
      {/* ── Cards de resumen ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Total invertido */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total invertido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {totalInvertidoUSD > 0 && (
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {formatCurrency(totalInvertidoUSD, "USD")}
              </p>
            )}
            {totalInvertidoARS > 0 && (
              <p
                className={cn(
                  "font-semibold text-foreground",
                  totalInvertidoUSD > 0
                    ? "text-base text-muted-foreground"
                    : "text-2xl tracking-tight"
                )}
              >
                {formatCurrency(totalInvertidoARS, "ARS")}
              </p>
            )}
            {totalInvertidoUnif !== null && totalInvertidoUSD > 0 && totalInvertidoARS > 0 && (
              <p className="text-xs text-muted-foreground pt-1">
                ≈ {formatCurrency(totalInvertidoUnif, "ARS")} en ARS
              </p>
            )}
          </CardContent>
        </Card>

        {/* Valor actual estimado */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Valor actual estimado
              {rendimientoGlobal !== null && (
                <span
                  className={cn(
                    "ml-auto text-xs font-semibold px-2 py-0.5 rounded-full",
                    rendimientoGlobal >= 0
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-rose-400/10 text-rose-400"
                  )}
                >
                  {rendimientoGlobal >= 0 ? "+" : ""}
                  {rendimientoGlobal.toFixed(2)}%
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {totalActualUSD > 0 && (
              <p
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  rendimientoGlobal === null
                    ? "text-foreground"
                    : rendimientoGlobal >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                )}
              >
                {formatCurrency(totalActualUSD, "USD")}
              </p>
            )}
            {totalActualARS > 0 && (
              <p
                className={cn(
                  "font-semibold",
                  totalActualUSD > 0
                    ? "text-base text-muted-foreground"
                    : cn(
                        "text-2xl tracking-tight",
                        rendimientoGlobal === null
                          ? "text-foreground"
                          : rendimientoGlobal >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      )
                )}
              >
                {formatCurrency(totalActualARS, "ARS")}
              </p>
            )}
            {blueVenta && (
              <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                Dólar Blue: {formatCurrency(blueVenta, "ARS")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Por broker + sin asignar ───────────────────────────────────── */}
      <div className="space-y-10">
        {brokers.map((b) => (
          <section key={b.cuenta_id} className="space-y-3">
            <div className="rounded-xl border border-border bg-secondary/25 px-4 py-3 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary flex-shrink-0">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground truncate">
                      {b.cuenta_nombre}
                    </h2>
                    <Badge variant="outline" className="text-xs font-mono mt-1">
                      {b.moneda}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-background/50 border border-border/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Saldo en cuenta</p>
                  <p className="font-semibold tabular-nums text-foreground mt-0.5">
                    {formatCurrency(b.saldo_cuenta, b.moneda)}
                  </p>
                </div>
                <div className="rounded-lg bg-background/50 border border-border/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Valor mercado (posiciones)
                  </p>
                  <p className="font-semibold tabular-nums text-foreground mt-0.5">
                    {formatCurrency(b.valor_mercado_posiciones, b.moneda)}
                  </p>
                </div>
                <div className="rounded-lg bg-background/50 border border-border/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">No invertido</p>
                  <p
                    className={cn(
                      "font-semibold tabular-nums mt-0.5",
                      b.no_invertido < 0 ? "text-rose-400" : "text-foreground"
                    )}
                  >
                    {formatCurrency(b.no_invertido, b.moneda)}
                  </p>
                </div>
              </div>
            </div>

            {b.inversiones.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-1">—</p>
            ) : (
              <div className="space-y-3">
                {b.inversiones.map((inv) => (
                  <FilaInversion
                    key={inv.id}
                    inv={inv}
                    blueVenta={blueVenta}
                    onEdit={setEditTarget}
                    onViewDetail={setDetailTarget}
                    onSellRequest={setSellTarget}
                    onDeleteRequest={(i) => {
                      setDeleteError(null);
                      setDeleteTarget(i);
                    }}
                    showBrokerLine={false}
                  />
                ))}
              </div>
            )}
          </section>
        ))}

        {sinBroker.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Sin cuenta broker
            </h2>
            <div className="space-y-3">
              {sinBroker.map((inv) => (
                <FilaInversion
                  key={inv.id}
                  inv={inv}
                  blueVenta={blueVenta}
                  onEdit={setEditTarget}
                  onViewDetail={setDetailTarget}
                  onSellRequest={setSellTarget}
                  onDeleteRequest={(i) => {
                    setDeleteError(null);
                    setDeleteTarget(i);
                  }}
                  showBrokerLine
                />
              ))}
            </div>
          </section>
        )}

        {cerradas.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Activos cerrados (vencidos / vendidos)
            </h2>
            <div className="space-y-3">
              {cerradas.map((inv) => (
                <FilaInversion
                  key={inv.id}
                  inv={inv}
                  blueVenta={blueVenta}
                  onEdit={setEditTarget}
                  onViewDetail={setDetailTarget}
                  onSellRequest={setSellTarget}
                  onDeleteRequest={(i) => {
                    setDeleteError(null);
                    setDeleteTarget(i);
                  }}
                  showBrokerLine
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <Dialog
        open={!!sellTarget}
        onOpenChange={(v) => {
          if (!v) {
            setSellTarget(null);
            setSellError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Vender activo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSellSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="sell_precio_venta">
                Precio de venta ({sellTarget?.moneda})
              </Label>
              <Input
                id="sell_precio_venta"
                name="precio_venta"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.0001"
                placeholder="0.00"
                autoFocus
                disabled={isPendingSell}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sell_fecha_venta">Fecha de venta</Label>
              <Input
                id="sell_fecha_venta"
                name="fecha_venta"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                disabled={isPendingSell}
              />
            </div>
            {sellError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{sellError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSellTarget(null);
                  setSellError(null);
                }}
                disabled={isPendingSell}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPendingSell} className="gap-2">
                {isPendingSell && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar venta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: actualizar precio ─────────────────────────────────── */}
      <Dialog
        open={!!detailTarget}
        onOpenChange={(v) => !v && setDetailTarget(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de compras</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                Precio promedio actual:{" "}
                <strong className="text-foreground">
                  {formatCurrency(detailTarget.precio_compra, detailTarget.moneda)}
                </strong>
              </div>
              {detailTarget.movimientos.length === 0 ? null : (
                <div className="max-h-[360px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-right p-2">Cantidad</th>
                        <th className="text-right p-2">Precio unitario</th>
                        <th className="text-right p-2">Monto total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailTarget.movimientos.map((m) => (
                        <tr key={m.id} className="border-t border-border">
                          <td className="p-2">
                            {new Intl.DateTimeFormat("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }).format(new Date(`${m.fecha}T12:00:00`))}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {m.cantidad.toLocaleString("es-AR", {
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {formatCurrency(m.precio_unitario, detailTarget.moneda)}
                          </td>
                          <td className="p-2 text-right tabular-nums font-medium">
                            {formatCurrency(m.monto_total, detailTarget.moneda)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: actualizar precio ─────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) {
            setEditTarget(null);
            setEditError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Actualizar precio
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-1">
            <input type="hidden" name="inversion_id" value={editTarget?.id ?? ""} />
            <div className="space-y-1.5">
              <Label htmlFor="edit_precio_actual">
                Precio actual ({editTarget?.moneda})
              </Label>
              <Input
                id="edit_precio_actual"
                name="precio_actual"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.0001}
                defaultValue={editTarget?.precio_actual ?? ""}
                placeholder="0.00"
                autoFocus
                disabled={isPendingEdit}
              />
            </div>

            {editError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{editError}</AlertDescription>
              </Alert>
            )}

            <Separator />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditTarget(null);
                  setEditError(null);
                }}
                disabled={isPendingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPendingEdit} className="gap-2">
                {isPendingEdit && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: confirmar eliminación ─────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Eliminar inversión
            </DialogTitle>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">
                {deleteError}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={isPendingDelete}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPendingDelete}
              className="gap-2"
            >
              {isPendingDelete && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
