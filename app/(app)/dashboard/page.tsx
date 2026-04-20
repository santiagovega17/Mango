import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PlusCircle,
  PieChart,
  Scale,
  Banknote,
} from "lucide-react";
import Link from "next/link";
import { NuevaCuentaDialog } from "@/components/nueva-cuenta-dialog";
import { NuevaTransaccionDialog } from "@/components/nueva-transaccion-dialog";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getDashboardData(user!.id);

  const {
    saldoDisponibleARS,
    saldoDisponibleUSD,
    totalInvertidoARS,
    totalInvertidoUSD,
    totalInvertidoEnARS,
    patrimonioNetoEnARS,
    cotizacionBlueVenta,
    ingresosARS,
    ingresosUSD,
    egresosARS,
    egresosUSD,
    cuentas,
    transaccionesRecientes,
    mesActual,
    porCobrarARS,
    porCobrarUSD,
    totalPorCobrarEnARS,
  } = data;

  const tieneCuentas = cuentas.length > 0;
  const ahorroNetoARS = ingresosARS - egresosARS;
  const ahorroNetoUSD = ingresosUSD - egresosUSD;
  const pctAhorroARS =
    ingresosARS > 0
      ? ((ahorroNetoARS / ingresosARS) * 100).toFixed(1)
      : "0.0";

  const mesCards = [
    {
      id: "ingresos",
      title: "Ingresos del Mes",
      description: `${mesActual} · ARS`,
      value: formatCurrency(ingresosARS, "ARS"),
      subValue: ingresosUSD > 0 ? `+ ${formatCurrency(ingresosUSD, "USD")}` : null,
      icon: TrendingUp,
      accentColor: "text-emerald-400",
      accentBg: "bg-emerald-400/10",
      borderHover: "hover:border-emerald-400/30",
    },
    {
      id: "egresos",
      title: "Egresos del Mes",
      description: `${mesActual} · ARS`,
      value: formatCurrency(egresosARS, "ARS"),
      subValue: egresosUSD > 0 ? `+ ${formatCurrency(egresosUSD, "USD")}` : null,
      icon: TrendingDown,
      accentColor: "text-rose-400",
      accentBg: "bg-rose-400/10",
      borderHover: "hover:border-rose-400/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <NuevaCuentaDialog triggerVariant="outline" triggerSize="sm" />
          <NuevaTransaccionDialog cuentasIniciales={cuentas} />
        </div>
      </div>

      {/* ── Empty state: sin cuentas ────────────────────────────────────────── */}
      {!tieneCuentas && (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Sin cuentas</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <NuevaCuentaDialog
                triggerLabel="Crear mi primera cuenta"
                triggerVariant="default"
                triggerSize="default"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 5 tarjetas de resumen (misma fila en xl) ───────────────────────── */}
      {tieneCuentas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
          {/* Liquidez */}
          <Card className="min-w-0 border-sky-500/25 bg-gradient-to-br from-sky-500/[0.07] to-transparent p-4 shadow-sm shadow-sky-900/10">
            <CardHeader className="p-0 pb-2 space-y-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-sky-300/90 leading-tight">
                    Saldo disponible
                  </CardDescription>
                  <CardTitle className="text-sm font-semibold text-foreground mt-0.5 truncate">
                    Liquidez
                  </CardTitle>
                </div>
                <div className="rounded-lg bg-sky-500/15 p-1.5 shrink-0">
                  <Wallet className="h-4 w-4 text-sky-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-tight truncate mb-0.5">
                  Efectivo, banco, billetera + no invertido en brokers
                </p>
                <p className="text-lg font-bold tabular-nums tracking-tight text-foreground break-all">
                  {formatCurrency(saldoDisponibleARS, "ARS")}
                </p>
              </div>
              <div className="h-px bg-border/60" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-tight mb-0.5">USD</p>
                <p className="text-base font-bold tabular-nums tracking-tight text-emerald-400/95 break-all">
                  {formatCurrency(saldoDisponibleUSD, "USD")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Por cobrar */}
          <Card className="min-w-0 border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-4 shadow-sm shadow-amber-950/10">
            <CardHeader className="p-0 pb-2 space-y-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90 leading-tight">
                    Ingresos pendientes
                  </CardDescription>
                  <CardTitle className="text-sm font-semibold text-foreground mt-0.5 truncate">
                    Por cobrar
                  </CardTitle>
                </div>
                <div className="rounded-lg bg-amber-500/15 p-1.5 shrink-0">
                  <Banknote className="h-4 w-4 text-amber-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              {totalPorCobrarEnARS != null ? (
                <p className="text-lg font-bold tabular-nums tracking-tight text-foreground break-all">
                  {formatCurrency(totalPorCobrarEnARS, "ARS")}
                </p>
              ) : (
                <div className="space-y-0.5 min-w-0">
                  <p className="text-base font-bold tabular-nums break-all">
                    {formatCurrency(porCobrarARS, "ARS")}
                  </p>
                  {porCobrarUSD > 0 && (
                    <p className="text-sm font-bold tabular-nums text-amber-300/95 break-all">
                      + {formatCurrency(porCobrarUSD, "USD")}
                    </p>
                  )}
                </div>
              )}
              {totalPorCobrarEnARS != null && porCobrarUSD > 0 && (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Incluye USD a tipo blue venta
                  {cotizacionBlueVenta != null && (
                    <span className="text-amber-300/80 font-medium">
                      {" "}
                      (${cotizacionBlueVenta.toLocaleString("es-AR")})
                    </span>
                  )}
                </p>
              )}
              {porCobrarARS === 0 && porCobrarUSD === 0 ? (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Nada anotado.{" "}
                  <Link
                    href="/por-cobrar"
                    className="text-amber-400/95 hover:underline underline-offset-2"
                  >
                    Agregar
                  </Link>
                </p>
              ) : (
                <Link
                  href="/por-cobrar"
                  className="inline-block text-[10px] font-medium text-amber-400/95 hover:underline underline-offset-2"
                >
                  Gestionar por cobrar →
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Total invertido */}
          <Card className="min-w-0 border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-4">
            <CardHeader className="p-0 pb-2 space-y-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80 leading-tight">
                    Cartera
                  </CardDescription>
                  <CardTitle className="text-sm font-semibold text-foreground mt-0.5 truncate">
                    Total invertido
                  </CardTitle>
                </div>
                <div className="rounded-lg bg-violet-500/15 p-1.5 shrink-0">
                  <PieChart className="h-4 w-4 text-violet-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-1.5 min-w-0">
              {totalInvertidoEnARS != null ? (
                <>
                  <p className="text-lg font-bold tabular-nums tracking-tight text-foreground break-all">
                    {formatCurrency(totalInvertidoEnARS, "ARS")}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-3">
                    Estimado (× precio actual o compra) · blue venta
                    {cotizacionBlueVenta != null && (
                      <span className="text-violet-300/90 font-medium">
                        {" "}
                        (${cotizacionBlueVenta.toLocaleString("es-AR")})
                      </span>
                    )}
                    .
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-base font-bold tabular-nums break-all">
                      {formatCurrency(totalInvertidoARS, "ARS")}
                    </p>
                    <p className="text-sm font-bold tabular-nums text-emerald-400/90 break-all">
                      {formatCurrency(totalInvertidoUSD, "USD")}
                    </p>
                  </div>
                  <p className="text-[10px] text-amber-400/90 leading-tight line-clamp-2">
                    Sin cotización no hay total único en ARS.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Patrimonio neto */}
          <Card className="min-w-0 border-emerald-500/15 bg-secondary/20 p-4">
            <CardHeader className="p-0 pb-2 space-y-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold text-foreground truncate">
                    Patrimonio neto
                  </CardTitle>
                  <CardDescription className="text-[10px] leading-tight text-muted-foreground mt-0.5 line-clamp-2">
                    Liquidez + inversiones (ARS unificado)
                  </CardDescription>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-1.5 shrink-0">
                  <Scale className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 min-w-0">
              {patrimonioNetoEnARS != null ? (
                <p className="text-lg font-bold tabular-nums tracking-tight text-emerald-400 break-all">
                  {formatCurrency(patrimonioNetoEnARS, "ARS")}
                </p>
              ) : (
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">No disponible</p>
                  <p className="text-[10px] text-muted-foreground/80 leading-tight line-clamp-3">
                    Falta cotización blue para unificar USD.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ingresos y Egresos del mes */}
          {mesCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.id}
                className={`min-w-0 p-4 border-border transition-all duration-200 ${card.borderHover} cursor-default`}
              >
                <CardHeader className="p-0 pb-2 space-y-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight line-clamp-2 pr-1">
                      {card.title}
                    </CardDescription>
                    <div className={`rounded-lg p-1.5 shrink-0 ${card.accentBg}`}>
                      <Icon className={`h-4 w-4 ${card.accentColor}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 space-y-1 min-w-0">
                  <p className="text-lg font-bold tracking-tight text-foreground tabular-nums break-all">
                    {card.value}
                  </p>
                  {card.subValue && (
                    <p className={`text-[10px] font-medium truncate ${card.accentColor}`}>
                      {card.subValue}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground capitalize leading-tight truncate">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      {tieneCuentas && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Tabla de transacciones recientes */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">
                  Últimas transacciones
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Actividad reciente de todas tus cuentas
                </CardDescription>
              </div>
              <NuevaTransaccionDialog
                cuentasIniciales={cuentas}
                compact
              />
            </CardHeader>
            <CardContent>
              {transaccionesRecientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
                  <PlusCircle className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Aún no hay transacciones este mes.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {transaccionesRecientes.map((tx) => {
                    const esIngreso = tx.tipo === "ingreso";
                    const fecha = new Intl.DateTimeFormat("es-AR", {
                      day: "2-digit",
                      month: "short",
                    }).format(new Date(tx.fecha + "T00:00:00"));

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                              esIngreso
                                ? "bg-emerald-400/10 text-emerald-400"
                                : "bg-rose-400/10 text-rose-400"
                            }`}
                          >
                            {esIngreso ? "↑" : "↓"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {tx.descripcion ?? tx.tipo}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tx.categoria_nombre ?? "Sin categoría"}
                              {tx.cuenta_nombre && ` · ${tx.cuenta_nombre}`}
                              {" · "}
                              {fecha}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-semibold tabular-nums flex-shrink-0 ml-2 ${
                            esIngreso ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {esIngreso ? "+" : "-"}
                          {formatCurrency(tx.monto, tx.moneda)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel de balance del mes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                Balance del mes
              </CardTitle>
              <CardDescription className="text-xs mt-1 capitalize">
                {mesActual}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {ingresosARS + egresosARS === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Sin movimientos este mes.
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Registrá tu primer ingreso o egreso para ver el balance.
                  </p>
                </div>
              ) : (
                <>
                  {/* Barras de progreso */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Ingresos ARS</span>
                      <span className="text-emerald-400 font-medium tabular-nums">
                        {formatCurrency(ingresosARS, "ARS")}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                        style={{
                          width:
                            ingresosARS + egresosARS > 0
                              ? `${Math.round((ingresosARS / (ingresosARS + egresosARS)) * 100)}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Egresos ARS</span>
                      <span className="text-rose-400 font-medium tabular-nums">
                        {formatCurrency(egresosARS, "ARS")}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-400 transition-all duration-700"
                        style={{
                          width:
                            ingresosARS + egresosARS > 0
                              ? `${Math.round((egresosARS / (ingresosARS + egresosARS)) * 100)}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>

                  {/* Ahorro neto */}
                  <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Ahorro neto ARS</p>
                    <p
                      className={`text-xl font-bold tabular-nums ${
                        ahorroNetoARS >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {ahorroNetoARS >= 0 ? "+" : ""}
                      {formatCurrency(ahorroNetoARS, "ARS")}
                    </p>
                    <Badge
                      variant={ahorroNetoARS >= 0 ? "success" : "danger"}
                      className="text-xs"
                    >
                      {ahorroNetoARS >= 0 ? "+" : ""}
                      {pctAhorroARS}% del total ingresado
                    </Badge>
                    {ahorroNetoUSD !== 0 && (
                      <p className={`text-xs font-medium ${ahorroNetoUSD >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                        USD: {ahorroNetoUSD >= 0 ? "+" : ""}{formatCurrency(ahorroNetoUSD, "USD")}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Mis cuentas */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  Mis cuentas ({cuentas.length})
                </p>
                {cuentas.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs bg-secondary rounded px-1.5 py-0.5 font-mono font-semibold text-muted-foreground flex-shrink-0">
                        {c.moneda}
                      </span>
                      <span className="text-sm text-foreground truncate">
                        {c.nombre}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2 tabular-nums">
                      {formatCurrency(
                        c.saldo_disponible ?? c.saldo_inicial,
                        c.moneda
                      )}
                    </span>
                  </div>
                ))}
                {cuentas.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{cuentas.length - 4} más
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
