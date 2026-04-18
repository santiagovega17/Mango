"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Wallet,
  ArrowLeftRight,
  Tags,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NuevaCuentaDialog } from "@/components/nueva-cuenta-dialog";
import { NuevaTransaccionDialog } from "@/components/nueva-transaccion-dialog";
import type { CuentaResumen } from "@/lib/data";
import { cn } from "@/lib/utils";

interface Props {
  cuentaCount: number;
  transaccionCount: number;
  cuentas: CuentaResumen[];
}

export function OnboardingWizard({
  cuentaCount,
  transaccionCount,
  cuentas,
}: Props) {
  const router = useRouter();
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);

  const step1Done = cuentaCount > 0;
  const step2Done = transaccionCount > 0;

  function refresh() {
    router.refresh();
  }

  const steps = [
    {
      id: 1,
      title: "Tu primera cuenta",
      description:
        "Registrá al menos una cuenta (banco, efectivo, billetera…) para poder cargar movimientos.",
      done: step1Done,
      icon: Wallet,
    },
    {
      id: 2,
      title: "Tu primer movimiento",
      description:
        "Registrá un ingreso o un egreso. Las transferencias entre cuentas las podés hacer después desde Transacciones.",
      done: step2Done,
      icon: ArrowLeftRight,
    },
    {
      id: 3,
      title: "Categorías (opcional)",
      description:
        "Al cargar transacciones podés asignar una categoría para ver después cuánto gastás por rubro en el resumen anual.",
      done: step2Done,
      icon: Tags,
    },
  ];

  return (
    <div className="space-y-8">
      <ol className="space-y-3">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <li
              key={s.id}
              className={cn(
                "flex gap-3 rounded-xl border px-4 py-3 transition-colors",
                s.done
                  ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                  : "border-border bg-card/40"
              )}
            >
              <div className="pt-0.5 shrink-0">
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {s.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {!step1Done && (
        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 1 · Crear cuenta</CardTitle>
            <CardDescription className="text-xs">
              Abrí el formulario y completá nombre, tipo y moneda.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              className="gap-2"
              onClick={() => setCuentaOpen(true)}
            >
              <Wallet className="h-4 w-4" />
              Crear mi primera cuenta
            </Button>
            <NuevaCuentaDialog
              open={cuentaOpen}
              onOpenChange={setCuentaOpen}
              onSuccess={refresh}
            />
          </CardContent>
        </Card>
      )}

      {step1Done && !step2Done && (
        <Card className="border-sky-500/25 bg-sky-500/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paso 2 · Primer ingreso o egreso</CardTitle>
            <CardDescription className="text-xs">
              Usá una cuenta real o de prueba; siempre podés editar o borrar
              después.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => setTxOpen(true)}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Registrar movimiento
            </Button>
            <NuevaTransaccionDialog
              cuentasIniciales={cuentas}
              open={txOpen}
              onOpenChange={setTxOpen}
              onSuccess={refresh}
            />
          </CardContent>
        </Card>
      )}

      {step1Done && step2Done && (
        <Card className="border-violet-500/25 bg-violet-500/[0.05]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-violet-400" />
              ¡Listo para usar Mango!
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              <strong className="text-foreground/90">Categorías:</strong> en{" "}
              <Link
                href="/transacciones"
                className="text-primary underline-offset-2 hover:underline"
              >
                Transacciones
              </Link>{" "}
              podés editar cada movimiento y elegir categoría para ordenar tus
              gastos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard">Ir al dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/transacciones">Ver transacciones</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/resumen">Resumen anual</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
