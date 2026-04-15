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
  DollarSign,
  BadgeDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PlusCircle,
} from "lucide-react";
import { NuevaCuentaDialog } from "@/components/nueva-cuenta-dialog";
import { NuevaTransaccionDialog } from "@/components/nueva-transaccion-dialog";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getDashboardData(user!.id);

  const {
    saldoTotalARS,
    saldoTotalUSD,
    ingresosARS,
    ingresosUSD,
    egresosARS,
    egresosUSD,
    cuentas,
    transaccionesRecientes,
    mesActual,
  } = data;

  const tieneCuentas = cuentas.length > 0;
  const totalIngresos = ingresosARS + ingresosUSD * 1; // simplificado; en producción usaría tipo de cambio
  const totalEgresos = egresosARS + egresosUSD;
  const ahorroNeto = totalIngresos - totalEgresos;
  const pctAhorro =
    totalIngresos > 0
      ? ((ahorroNeto / totalIngresos) * 100).toFixed(1)
      : "0.0";

  const summaryCards = [
    {
      id: "saldo-ars",
      title: "Saldo Total ARS",
      description: "Pesos argentinos",
      value: formatCurrency(saldoTotalARS, "ARS"),
      icon: BadgeDollarSign,
      accentColor: "text-sky-400",
      accentBg: "bg-sky-400/10",
      borderHover: "hover:border-sky-400/30",
    },
    {
      id: "saldo-usd",
      title: "Saldo Total USD",
      description: "Dólares estadounidenses",
      value: formatCurrency(saldoTotalUSD, "USD"),
      icon: DollarSign,
      accentColor: "text-emerald-400",
      accentBg: "bg-emerald-400/10",
      borderHover: "hover:border-emerald-400/30",
    },
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
      positive: true,
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
      positive: false,
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
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {mesActual}
          </p>
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
              <p className="text-base font-semibold text-foreground">
                ¡Bienvenido a Mango!
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Todavía no tenés cuentas registradas. Creá tu primera cuenta
                para empezar a controlar tus finanzas.
              </p>
            </div>
            <NuevaCuentaDialog
              triggerLabel="Crear mi primera cuenta"
              triggerVariant="default"
              triggerSize="default"
            />
          </CardContent>
        </Card>
      )}

      {/* ── Cards de resumen ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className={`border-border transition-all duration-200 ${card.borderHover} cursor-default`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {card.title}
                  </CardDescription>
                  <div className={`rounded-lg p-2 ${card.accentBg}`}>
                    <Icon className={`h-4 w-4 ${card.accentColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {card.value}
                </p>
                {card.subValue && (
                  <p className={`text-xs font-medium ${card.accentColor}`}>
                    {card.subValue}
                  </p>
                )}
                <p className="text-xs text-muted-foreground capitalize">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                    <p className="text-xs text-muted-foreground">Ahorro neto</p>
                    <p
                      className={`text-xl font-bold tabular-nums ${
                        ahorroNeto >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {ahorroNeto >= 0 ? "" : "-"}
                      {formatCurrency(Math.abs(ahorroNeto), "ARS")}
                    </p>
                    <Badge
                      variant={ahorroNeto >= 0 ? "success" : "danger"}
                      className="text-xs"
                    >
                      {ahorroNeto >= 0 ? "+" : ""}
                      {pctAhorro}% del total ingresado
                    </Badge>
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
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {formatCurrency(c.saldo_inicial, c.moneda)}
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
