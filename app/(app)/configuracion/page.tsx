import { createClient } from "@/lib/supabase/server";
import { getCuentasUsuario } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NuevaCuentaDialog } from "@/components/nueva-cuenta-dialog";
import { EliminarCuentaButton } from "@/components/eliminar-cuenta-button";
import { PerfilForm } from "@/components/perfil-form";
import {
  Wallet,
  User,
  Mail,
  CreditCard,
  Banknote,
  Smartphone,
  TrendingUp,
  LayoutGrid,
} from "lucide-react";

// ── Helpers de presentación ───────────────────────────────────────────────────

const TIPO_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  banco: {
    label: "Cuenta bancaria",
    icon: CreditCard,
    color: "text-sky-400 bg-sky-400/10",
  },
  efectivo: {
    label: "Efectivo",
    icon: Banknote,
    color: "text-emerald-400 bg-emerald-400/10",
  },
  billetera_virtual: {
    label: "Billetera virtual",
    icon: Smartphone,
    color: "text-violet-400 bg-violet-400/10",
  },
  tarjeta_credito: {
    label: "Tarjeta de crédito",
    icon: CreditCard,
    color: "text-amber-400 bg-amber-400/10",
  },
  inversion: {
    label: "Inversión",
    icon: TrendingUp,
    color: "text-primary bg-primary/10",
  },
  otro: {
    label: "Otro",
    icon: LayoutGrid,
    color: "text-muted-foreground bg-secondary",
  },
};

function getTipoMeta(tipo: string) {
  return TIPO_META[tipo] ?? TIPO_META["otro"];
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Perfil del usuario
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, moneda_principal")
    .eq("id", user!.id)
    .single();

  // Cuentas del usuario
  const cuentas = await getCuentasUsuario(user!.id);

  const nombre = perfil?.nombre ?? user!.email?.split("@")[0] ?? "Usuario";
  const monedaPrincipal =
    (perfil?.moneda_principal as "ARS" | "USD") ?? "ARS";

  // Iniciales para el avatar
  const initials = nombre
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const totalARS = cuentas
    .filter((c) => c.moneda === "ARS")
    .reduce((acc, c) => acc + Number(c.saldo_inicial), 0);
  const totalUSD = cuentas
    .filter((c) => c.moneda === "USD")
    .reduce((acc, c) => acc + Number(c.saldo_inicial), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administrá tu perfil y tus cuentas financieras.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Columna izquierda: Perfil ──────────────────────────────────── */}
        <div className="space-y-6">
          {/* Card de perfil */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Mi perfil
              </CardTitle>
              <CardDescription className="text-xs">
                Datos que se muestran en la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {nombre}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">
                      {user!.email}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Formulario de edición */}
              <PerfilForm nombre={nombre} monedaPrincipal={monedaPrincipal} />
            </CardContent>
          </Card>

          {/* Card de resumen de cuentas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Resumen de fondos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total ARS
                  </p>
                  <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                    {formatCurrency(totalARS, "ARS")}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {cuentas.filter((c) => c.moneda === "ARS").length} cuentas
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total USD
                  </p>
                  <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                    {formatCurrency(totalUSD, "USD")}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {cuentas.filter((c) => c.moneda === "USD").length} cuentas
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Columna derecha: Cuentas ───────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Mis cuentas
                  {cuentas.length > 0 && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {cuentas.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Bancos, efectivo, billeteras y más.
                </CardDescription>
              </div>
              <NuevaCuentaDialog triggerVariant="default" triggerSize="sm" />
            </CardHeader>

            <CardContent>
              {cuentas.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center rounded-xl border-2 border-dashed border-border">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Wallet className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Todavía no tenés cuentas
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Creá tu primera cuenta para empezar a registrar tus
                      movimientos financieros.
                    </p>
                  </div>
                  <NuevaCuentaDialog
                    triggerLabel="Crear primera cuenta"
                    triggerVariant="default"
                  />
                </div>
              ) : (
                /* Lista de cuentas */
                <div className="space-y-3">
                  {cuentas.map((cuenta) => {
                    const meta = getTipoMeta(cuenta.tipo);
                    const Icon = meta.icon;

                    return (
                      <div
                        key={cuenta.id}
                        className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3.5 hover:bg-secondary/50 transition-colors group"
                      >
                        {/* Ícono del tipo */}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${meta.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {cuenta.nombre}
                            </p>
                            <Badge
                              variant="secondary"
                              className="text-xs flex-shrink-0 hidden sm:inline-flex"
                            >
                              {meta.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono font-semibold text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                              {cuenta.moneda}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Saldo inicial:{" "}
                              <span className="text-foreground font-medium tabular-nums">
                                {formatCurrency(
                                  Number(cuenta.saldo_inicial),
                                  cuenta.moneda
                                )}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <EliminarCuentaButton
                            cuentaId={cuenta.id}
                            cuentaNombre={cuenta.nombre}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Footer con totales por moneda */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {totalARS > 0 && (
                      <div className="rounded-lg bg-sky-400/5 border border-sky-400/15 px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">
                          Fondos en ARS
                        </p>
                        <p className="text-sm font-bold text-sky-400 tabular-nums mt-0.5">
                          {formatCurrency(totalARS, "ARS")}
                        </p>
                      </div>
                    )}
                    {totalUSD > 0 && (
                      <div className="rounded-lg bg-emerald-400/5 border border-emerald-400/15 px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">
                          Fondos en USD
                        </p>
                        <p className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
                          {formatCurrency(totalUSD, "USD")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
