"use client";

import { useMemo, useState, useTransition, useRef } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { NuevaTransaccionDialog } from "@/components/nueva-transaccion-dialog";
import { NuevaTransferenciaDialog } from "@/components/nueva-transferencia-dialog";
import { CategoriaCombobox } from "@/components/categoria-combobox";
import {
  editarTransaccion,
  eliminarTransaccion,
  obtenerCategoriasAction,
} from "@/lib/actions";
import type { TransaccionCompleta, CuentaResumen } from "@/lib/data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

function getMesKey(iso: string) {
  return iso.slice(0, 7);
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

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroCuenta, setFiltroCuenta] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroMes, setFiltroMes] = useState(mesActual);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  // CRUD state
  const [editTarget, setEditTarget] = useState<TransaccionCompleta | null>(null);
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TransaccionCompleta | null>(null);
  const [isPendingDelete, startDelete] = useTransition();
  const [isPendingEdit, startEdit] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Categorias para el form de edición (lazy)
  const [categorias, setCategorias] = useState<
    { id: string; nombre: string; color: string | null }[]
  >([]);
  const categoriasCargadas = useRef(false);

  function openEdit(tx: TransaccionCompleta) {
    setEditTarget(tx);
    setEditCategoriaId(tx.categoria_id ?? "");
    setEditError(null);
    if (!categoriasCargadas.current) {
      obtenerCategoriasAction().then((data) => {
        setCategorias(data);
        categoriasCargadas.current = true;
      });
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const meses = useMemo(() => {
    const set = new Set(transacciones.map((t) => getMesKey(t.fecha)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transacciones]);

  const categoriasUnicas = useMemo(() => {
    const map = new Map<string, string>();
    transacciones.forEach((t) => {
      if (t.categoria_nombre) map.set(t.categoria_nombre, t.categoria_nombre);
    });
    return Array.from(map.entries());
  }, [transacciones]);

  const filtradas = useMemo(() => {
    return transacciones.filter((t) => {
      if (filtroMes !== "todos" && getMesKey(t.fecha) !== filtroMes) return false;
      if (filtroCuenta !== "todas" && t.cuenta_id !== filtroCuenta) return false;
      if (filtroCategoria !== "todas" && t.categoria_nombre !== filtroCategoria) return false;
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

  const totales = useMemo(() => {
    return {
      ingresosARS: filtradas.filter((t) => t.tipo === "ingreso" && t.moneda === "ARS").reduce((a, t) => a + t.monto, 0),
      egresosARS: filtradas.filter((t) => t.tipo === "egreso" && t.moneda === "ARS").reduce((a, t) => a + t.monto, 0),
      ingresosUSD: filtradas.filter((t) => t.tipo === "ingreso" && t.moneda === "USD").reduce((a, t) => a + t.monto, 0),
      egresosUSD: filtradas.filter((t) => t.tipo === "egreso" && t.moneda === "USD").reduce((a, t) => a + t.monto, 0),
    };
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

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startDelete(async () => {
      const res = await eliminarTransaccion(deleteTarget.id);
      if (res.error) {
        setDeleteError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Transacción eliminada.");
        setDeleteTarget(null);
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("transaccion_id", editTarget.id);

    startEdit(async () => {
      const res = await editarTransaccion(formData);
      if (res.error) {
        setEditError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Transacción actualizada.");
        setEditTarget(null);
      }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-4">
        {/* Barra de filtros */}
        <div className="flex flex-col gap-3">
          {/* Búsqueda + botones de acción */}
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
            <NuevaTransferenciaDialog cuentasIniciales={cuentas} />
            <NuevaTransaccionDialog cuentasIniciales={cuentas} />
          </div>

          {/* Selectores de filtro */}
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />

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

            {categoriasUnicas.length > 0 && (
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="h-9 w-auto min-w-[150px] bg-secondary/50 border-border/80 text-sm">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categoriasUnicas.map(([nombre]) => (
                    <SelectItem key={nombre} value={nombre}>
                      {nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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

        {/* Chips de resumen */}
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

        {/* Tabla */}
        <div className="rounded-xl border border-border overflow-hidden">
          {transacciones.length === 0 ? (
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
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">Sin resultados</p>
              <p className="text-xs text-muted-foreground">
                No hay transacciones que coincidan con los filtros.
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
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
                  <TableHead className="hidden lg:table-cell w-[100px]">Tipo</TableHead>
                  <TableHead className="text-right w-[140px]">Monto</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((tx) => {
                  const esIngreso = tx.tipo === "ingreso";
                  const esEgreso = tx.tipo === "egreso";
                  const esTransferencia = tx.tipo === "transferencia";

                  return (
                    <TableRow key={tx.id} className="group">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatFecha(tx.fecha)}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2.5">
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
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                              {tx.descripcion ?? tx.tipo}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 md:hidden truncate">
                              {tx.categoria_nombre ?? "Sin categoría"}
                              {tx.cuenta_nombre && ` · ${tx.cuenta_nombre}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {tx.categoria_nombre ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tx.categoria_color ?? "#6b7280" }}
                            />
                            <span className="text-sm text-foreground truncate max-w-[120px]">
                              {tx.categoria_nombre}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                          {tx.cuenta_nombre ?? "—"}
                        </span>
                      </TableCell>

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
                          ) : (
                            <ArrowLeftRight className="h-3 w-3 mr-1" />
                          )}
                          {tx.tipo.charAt(0).toUpperCase() + tx.tipo.slice(1)}
                        </Badge>
                      </TableCell>

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

                      {/* Acciones */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(tx)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-400"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(tx);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* ── Dialog: Editar transacción ──────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) { setEditTarget(null); setEditError(null); setEditCategoriaId(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar transacción
            </DialogTitle>
            <DialogDescription>
              Modificá los datos de esta transacción.
            </DialogDescription>
          </DialogHeader>

          {editTarget && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-1">
              <input type="hidden" name="transaccion_id" value={editTarget.id} />

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select
                  name="tipo"
                  defaultValue={editTarget.tipo}
                  className="w-full h-10 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>

              {/* Monto + Moneda */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_monto">Monto</Label>
                  <Input
                    id="edit_monto"
                    name="monto"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={editTarget.monto}
                    required
                    disabled={isPendingEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <select
                    name="moneda"
                    defaultValue={editTarget.moneda}
                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Cuenta */}
              <div className="space-y-1.5">
                <Label>Cuenta</Label>
                <select
                  name="cuenta_id"
                  defaultValue={editTarget.cuenta_id}
                  className="w-full h-10 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                  disabled={isPendingEdit}
                >
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.moneda})
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría */}
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                {/* input oculto para que FormData capture el valor */}
                <input
                  type="hidden"
                  name="categoria_id"
                  value={editCategoriaId}
                />
                <CategoriaCombobox
                  categorias={categorias}
                  value={editCategoriaId}
                  onChange={setEditCategoriaId}
                  disabled={isPendingEdit}
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_descripcion">Descripción</Label>
                <Input
                  id="edit_descripcion"
                  name="descripcion"
                  defaultValue={editTarget.descripcion ?? ""}
                  disabled={isPendingEdit}
                />
              </div>

              {/* Fecha */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_fecha">Fecha</Label>
                <Input
                  id="edit_fecha"
                  name="fecha"
                  type="date"
                  defaultValue={editTarget.fecha}
                  required
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
                  onClick={() => { setEditTarget(null); setEditError(null); }}
                  disabled={isPendingEdit}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPendingEdit} className="gap-2">
                  {isPendingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar eliminación ──────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) { setDeleteTarget(null); setDeleteError(null); }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Eliminar transacción
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro? Esta acción no se puede deshacer.
              {deleteTarget && (
                <span className="block mt-1 font-medium text-foreground">
                  "{deleteTarget.descripcion ?? deleteTarget.tipo}" —{" "}
                  {formatCurrency(deleteTarget.monto, deleteTarget.moneda)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">{deleteError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
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
              {isPendingDelete && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
