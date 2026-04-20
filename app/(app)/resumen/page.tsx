import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getResumenAnual } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResumenPrintButton } from "@/components/resumen-print-button";
import { CalendarRange, TrendingDown, TrendingUp } from "lucide-react";

export const metadata = {
  title: "Resumen anual · Mango",
};

function parseYear(raw: string | undefined): number {
  const n = parseInt(raw ?? "", 10);
  const now = new Date().getFullYear();
  if (!Number.isFinite(n) || n < 2000 || n > now) return now;
  return n;
}

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawAño = searchParams.año;
  const añoParam = Array.isArray(rawAño) ? rawAño[0] : rawAño;
  const year = parseYear(añoParam);
  const nowY = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => nowY - i);

  const data = await getResumenAnual(user.id, year);
  const hayMovimientos =
    data.totales.ingresos.ARS +
      data.totales.ingresos.USD +
      data.totales.egresos.ARS +
      data.totales.egresos.USD +
      data.totales.transferenciasCount >
    0;

  return (
    <div className="space-y-8 print:space-y-4" id="resumen-anual">
      <div className="print:block flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <CalendarRange className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wider">
              Producto
            </p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Resumen anual {year}
          </h1>
        </div>
        <ResumenPrintButton />
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {yearOptions.map((y) => (
          <Link
            key={y}
            href={y === nowY ? "/resumen" : `/resumen?año=${y}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              y === year
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary/40 text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {y}
          </Link>
        ))}
      </div>

      {!hayMovimientos ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Sin datos en {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/transacciones"
              className="text-sm text-primary underline-offset-2 hover:underline"
            >
              Ir a transacciones
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-500/20 bg-emerald-500/[0.04]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Ingresos ARS
                </CardDescription>
                <CardTitle className="text-lg tabular-nums">
                  {formatCurrency(data.totales.ingresos.ARS, "ARS")}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-emerald-500/20 bg-emerald-500/[0.04]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Ingresos USD
                </CardDescription>
                <CardTitle className="text-lg tabular-nums text-emerald-400/95">
                  {formatCurrency(data.totales.ingresos.USD, "USD")}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-rose-500/20 bg-rose-500/[0.04]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Egresos ARS
                </CardDescription>
                <CardTitle className="text-lg tabular-nums">
                  {formatCurrency(data.totales.egresos.ARS, "ARS")}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-rose-500/20 bg-rose-500/[0.04]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Egresos USD
                </CardDescription>
                <CardTitle className="text-lg tabular-nums text-rose-300/95">
                  {formatCurrency(data.totales.egresos.USD, "USD")}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground print:text-[10px]">
            Transferencias registradas en el año:{" "}
            <strong className="text-foreground/90">
              {data.totales.transferenciasCount}
            </strong>
          </p>

          <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Egresos por categoría</CardTitle>
                <CardDescription className="text-xs">
                  Suma de egresos en cada moneda.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">ARS</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.egresosPorCategoria.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground text-sm"
                        >
                          Sin egresos en {year} (o solo transferencias).
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.egresosPorCategoria.map((row) => (
                        <TableRow key={row.nombre}>
                          <TableCell className="font-medium">{row.nombre}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {row.ARS > 0
                              ? formatCurrency(row.ARS, "ARS")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {row.USD > 0
                              ? formatCurrency(row.USD, "USD")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ingresos por categoría</CardTitle>
                <CardDescription className="text-xs">
                  Suma de ingresos en cada moneda.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">ARS</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ingresosPorCategoria.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground text-sm"
                        >
                          Sin ingresos en {year} (o solo transferencias).
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.ingresosPorCategoria.map((row) => (
                        <TableRow key={row.nombre}>
                          <TableCell className="font-medium">{row.nombre}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {row.ARS > 0
                              ? formatCurrency(row.ARS, "ARS")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {row.USD > 0
                              ? formatCurrency(row.USD, "USD")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <p className="hidden text-[10px] text-muted-foreground/80 text-center print:block">
        Mango · resumen {year} · generado para uso personal
      </p>
    </div>
  );
}
