"use client";

import { useState, useTransition } from "react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { NuevaInversionDialog } from "@/components/nueva-inversion-dialog";
import { eliminarInversion, actualizarPrecioActual } from "@/lib/actions";
import type { InversionItem, CotizacionDolar } from "@/lib/data";

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  inversiones: InversionItem[];
  dolarBlue: CotizacionDolar | null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function InversionesCartera({ inversiones, dolarBlue }: Props) {
  const [editTarget, setEditTarget] = useState<InversionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InversionItem | null>(null);
  const [isPendingDelete, startDelete] = useTransition();
  const [isPendingEdit, startEdit] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const blueVenta = dolarBlue?.venta ?? null;

  // ── Totales de cartera ────────────────────────────────────────────────────

  const totalInvertidoARS = inversiones
    .filter((i) => i.moneda === "ARS")
    .reduce((acc, i) => acc + i.cantidad * i.precio_compra, 0);
  const totalInvertidoUSD = inversiones
    .filter((i) => i.moneda === "USD")
    .reduce((acc, i) => acc + i.cantidad * i.precio_compra, 0);

  const totalActualARS = inversiones
    .filter((i) => i.moneda === "ARS")
    .reduce(
      (acc, i) => acc + i.cantidad * (i.precio_actual ?? i.precio_compra),
      0
    );
  const totalActualUSD = inversiones
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

  // ── Render vacío ──────────────────────────────────────────────────────────

  if (inversiones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center rounded-xl border-2 border-dashed border-border">
        <TrendingUp className="h-12 w-12 text-muted-foreground/20" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Tu cartera está vacía
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Agregá tu primer activo para empezar a hacer seguimiento de tus
            inversiones.
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

      {/* ── Lista de activos ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {inversiones.map((inv) => {
          const meta = getTipoMeta(inv.tipo_activo);
          const Icon = meta.icon;
          const valorInvertido = inv.cantidad * inv.precio_compra;
          const valorActual =
            inv.cantidad * (inv.precio_actual ?? inv.precio_compra);
          const rendimiento = calcRendimiento(inv.precio_compra, inv.precio_actual);
          const ganancia = inv.precio_actual !== null
            ? valorActual - valorInvertido
            : null;

          return (
            <div
              key={inv.id}
              className="rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors p-4 group"
            >
              <div className="flex items-start gap-4">
                {/* Ícono de tipo */}
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 mt-0.5",
                    meta.bg
                  )}
                >
                  <Icon className={cn("h-5 w-5", meta.color)} />
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground leading-tight">
                      {inv.nombre_activo}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {inv.tipo_activo}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs font-mono"
                    >
                      {inv.moneda}
                    </Badge>
                  </div>

                  {/* Detalles en dos columnas */}
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
                      <p className="text-xs text-muted-foreground">Precio compra</p>
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
                          onClick={() => setEditTarget(inv)}
                          className="text-xs text-muted-foreground/60 hover:text-primary transition-colors underline underline-offset-2"
                        >
                          Actualizar precio
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rendimiento */}
                  {rendimiento !== null && (
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-sm font-semibold",
                          rendimiento >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
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
                            ganancia >= 0
                              ? "text-emerald-400/70"
                              : "text-rose-400/70"
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
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditTarget(inv)}
                    title="Actualizar precio"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(inv);
                    }}
                    title="Eliminar inversión"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
            <DialogDescription>
              Ingresá el precio actual de{" "}
              <strong>{editTarget?.nombre_activo}</strong> en{" "}
              {editTarget?.moneda}.
            </DialogDescription>
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
                min="0"
                step="any"
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
            <DialogDescription>
              ¿Estás seguro de que querés eliminar{" "}
              <strong>{deleteTarget?.nombre_activo}</strong>? Esta acción no se
              puede deshacer.
            </DialogDescription>
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
