"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NuevaTransaccionDialog } from "@/components/nueva-transaccion-dialog";
import type { TransaccionCompleta } from "@/lib/data";
import type { CuentaResumen } from "@/lib/data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

function getMesKey(iso: string) {
  return iso.slice(0, 7); // "YYYY-MM"
}

function formatMesKey(key: string) {
  const [anio, mes] = key.split("-");
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(anio), Number(mes) - 1, 1));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  transacciones: TransaccionCompleta[];
  cuentas: CuentaResumen[];
}

// ── Componente principal ──────────────────────────────────────────────────────

export function TransaccionesTable({ transacciones, cuentas }: Props) {
  const mesActual = new Date().toISOString().slice(0, 7);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCuenta, setFiltroCuenta] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroMes, setFiltroMes] = useState(mesActual);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  // Meses únicos presentes en las transacciones
  const meses = useMemo(() => {
    const set = new Set(transacciones.map((t) => getMesKey(t.fecha)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transacciones]);

  // Categorías únicas
  const categorias = useMemo(() => {
    const map = new Map<string, string>();
    transacciones.forEach((t) => {
      if (t.categoria_nombre)
        map.set(t.categoria_nombre, t.categoria_nombre);
    });
    return Array.from(map.entries());
  }, [transacciones]);

  // Transacciones filtradas
  const filtradas = useMemo(() => {
    return transacciones.filter((t) => {
      if (filtroMes !== "todos" && getMesKey(t.fecha) !== filtroMes)
        return false;
      if (filtroCuenta !== "todas" && t.cuenta_id !== filtroCuenta)
        return false;
      if (
        filtroCategoria !== "todas" &&
        t.categoria_nombre !== filtroCategoria
      )
        return false;
      if (filtroTipo !== "todos" && t.tipo !== filtroTipo) return false;
      if (
        busqueda.trim() &&
        !t.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) &&
        !t.categoria_nombre?.toLowerCase().includes(busqueda.toLowerCase()) &&
        !t.cuenta_nombre?.toLowerCase().includes(busqueda.toLowerCase())
      )
        return false;
      return true;
    });
  }, [transacciones, filtroMes, filtroCuenta, filtroCategoria, filtroTipo, busqueda]);

  // Totales de las filas filtradas
  const totales = useMemo(() => {
    const ingresosARS = filtradas
      .filter((t) => t.tipo === "ingreso" && t.moneda === "ARS")
      .reduce((a, t) => a + t.monto, 0);
    const egresosARS = filtradas
      .filter((t) => t.tipo === "egreso" && t.moneda === "ARS")
      .reduce((a, t) => a + t.monto, 0);
    const ingresosUSD = filtradas
      .filter((t) => t.tipo === "ingreso" && t.moneda === "USD")
      .reduce((a, t) => a + t.monto, 0);
    const egresosUSD = filtradas
      .filter((t) => t.tipo === "egreso" && t.moneda === "USD")
      .reduce((a, t) => a + t.monto, 0);
    return { ingresosARS, egresosARS, ingresosUSD, egresosUSD };
  }, [filtradas]);

  const hayFiltrosActivos =
    filtroCuenta !== "todas" ||
    filtroCategoria !== "todas" ||
    filtroTipo !== "todos" ||
    filtroMes !== mesActual ||
    busqueda.trim() !== "";

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroCuenta("todas");
    setFiltroCategoria("todas");
    setFiltroMes(mesActual);
    setFiltroTipo("todos");
  }

  return (
    <div className="space-y-4">
      {/* ── Barra de filtros ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Fila 1: búsqueda + botón nuevo */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              placeholder="Buscar por descripción, categoría o cuenta…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 bg-secondary/50 border-border/80 h-10"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <NuevaTransaccionDialog cuentasIniciales={cuentas} />
        </div>

        {/* Fila 2: selects de filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          {/* Mes */}
          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger className="h-9 w-auto min-w-[150px] bg-secondary/50 border-border/80 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los meses</SelectItem>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  <span className="capitalize">{formatMesKey(m)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tipo */}
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-9 w-auto min-w-[130px] bg-secondary/50 border-border/80 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ingreso">Ingresos</SelectItem>
              <SelectItem value="egreso">Egresos</SelectItem>
              <SelectItem value="transferencia">Transferencias</SelectItem>
            </SelectContent>
          </Select>

          {/* Cuenta */}
          {cuentas.length > 0 && (
            <Select value={filtroCuenta} onValueChange={setFiltroCuenta}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] bg-secondary/50 border-border/80 text-sm">
                <SelectValue placeholder="Cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las cuentas</SelectItem>
                {cuentas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Categoría */}
          {categorias.length > 0 && (
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="h-9 w-auto min-w-[150px] bg-secondary/50 border-border/80 text-sm">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias.map(([nombre]) => (
                  <SelectItem key={nombre} value={nombre}>
                    {nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Limpiar filtros */}
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* ── Chips de resumen ─────────────────────────────────────────── */}
      {filtradas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {filtradas.length} transacción{filtradas.length !== 1 ? "es" : ""}
          </span>
          {totales.ingresosARS > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-400/10 text-emerald-400 px-2.5 py-1">
              <ArrowUpRight className="h-3 w-3" />
              {formatCurrency(totales.ingresosARS, "ARS")}
            </div>
          )}
          {totales.egresosARS > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-rose-400/10 text-rose-400 px-2.5 py-1">
              <ArrowDownRight className="h-3 w-3" />
              {formatCurrency(totales.egresosARS, "ARS")}
            </div>
          )}
          {totales.ingresosUSD > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-400/10 text-emerald-400 px-2.5 py-1">
              <ArrowUpRight className="h-3 w-3" />
              {formatCurrency(totales.ingresosUSD, "USD")}
            </div>
          )}
          {totales.egresosUSD > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-rose-400/10 text-rose-400 px-2.5 py-1">
              <ArrowDownRight className="h-3 w-3" />
              {formatCurrency(totales.egresosUSD, "USD")}
            </div>
          )}
        </div>
      )}

      {/* ── Tabla ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden">
        {transacciones.length === 0 ? (
          /* Sin transacciones en absoluto */
          <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
            <div className="text-4xl">💸</div>
            <p className="text-sm font-medium text-foreground">
              Todavía no tenés transacciones
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Registrá tu primer ingreso o egreso usando el botón{" "}
              <strong>+ Nueva transacción</strong>.
            </p>
          </div>
        ) : filtradas.length === 0 ? (
          /* Sin resultados para los filtros activos */
          <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              Sin resultados
            </p>
            <p className="text-xs text-muted-foreground">
              No hay transacciones que coincidan con los filtros aplicados.
            </p>
            <Button variant="outline" size="sm" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-[110px]">Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="hidden md:table-cell">
                  Categoría
                </TableHead>
                <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
                <TableHead className="hidden lg:table-cell w-[100px]">
                  Tipo
                </TableHead>
                <TableHead className="text-right w-[140px]">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((tx) => {
                const esIngreso = tx.tipo === "ingreso";
                const esEgreso = tx.tipo === "egreso";

                return (
                  <TableRow key={tx.id}>
                    {/* Fecha */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatFecha(tx.fecha)}
                    </TableCell>

                    {/* Descripción */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {/* Ícono de tipo (mobile) */}
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 sm:hidden",
                            esIngreso
                              ? "bg-emerald-400/10 text-emerald-400"
                              : esEgreso
                              ? "bg-rose-400/10 text-rose-400"
                              : "bg-sky-400/10 text-sky-400"
                          )}
                        >
                          {esIngreso ? (
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                          ) : esEgreso ? (
                            <ArrowDownCircle className="h-3.5 w-3.5" />
                          ) : (
                            <span className="text-xs">↔</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                            {tx.descripcion ?? tx.tipo}
                          </p>
                          {/* Categoría y cuenta en mobile */}
                          <p className="text-xs text-muted-foreground mt-0.5 md:hidden truncate">
                            {tx.categoria_nombre ?? "Sin categoría"}
                            {tx.cuenta_nombre && ` · ${tx.cuenta_nombre}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Categoría */}
                    <TableCell className="hidden md:table-cell">
                      {tx.categoria_nombre ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: tx.categoria_color ?? "#6b7280",
                            }}
                          />
                          <span className="text-sm text-foreground truncate max-w-[120px]">
                            {tx.categoria_nombre}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* Cuenta */}
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                        {tx.cuenta_nombre ?? "—"}
                      </span>
                    </TableCell>

                    {/* Tipo (badge) */}
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant={
                          esIngreso
                            ? "success"
                            : esEgreso
                            ? "danger"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {esIngreso ? (
                          <ArrowUpCircle className="h-3 w-3 mr-1" />
                        ) : esEgreso ? (
                          <ArrowDownCircle className="h-3 w-3 mr-1" />
                        ) : null}
                        {tx.tipo.charAt(0).toUpperCase() + tx.tipo.slice(1)}
                      </Badge>
                    </TableCell>

                    {/* Monto */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            esIngreso
                              ? "text-emerald-400"
                              : esEgreso
                              ? "text-rose-400"
                              : "text-sky-400"
                          )}
                        >
                          {esIngreso ? "+" : esEgreso ? "-" : ""}
                          {formatCurrency(tx.monto, tx.moneda)}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground/60">
                          {tx.moneda}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
