"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Banknote,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CategoriaCombobox } from "@/components/categoria-combobox";
import {
  crearIngresoFuturo,
  editarIngresoFuturo,
  cobrarIngresoFuturo,
  eliminarIngresoFuturo,
  obtenerCategoriasAction,
} from "@/lib/actions";
import { parseFormDecimal } from "@/lib/form-numbers";
import { formatCurrency } from "@/lib/utils";
import type { IngresoFuturoListItem, CuentaResumen } from "@/lib/data";

interface Props {
  pendientes: IngresoFuturoListItem[];
  cobrados: IngresoFuturoListItem[];
  cuentas: CuentaResumen[];
}

function fechaLabel(iso: string | null) {
  if (!iso) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso + "T12:00:00"));
  } catch {
    return iso;
  }
}

export function IngresosFuturosPanel({
  pendientes: pendientesInicial,
  cobrados,
  cuentas,
}: Props) {
  const router = useRouter();
  const [openNuevo, setOpenNuevo] = useState(false);
  const [editItem, setEditItem] = useState<IngresoFuturoListItem | null>(null);
  const [cobrarItem, setCobrarItem] = useState<IngresoFuturoListItem | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const [monedaNuevo, setMonedaNuevo] = useState<"ARS" | "USD">("ARS");
  const [cuentaNuevo, setCuentaNuevo] = useState("");
  const [conFechaEsperada, setConFechaEsperada] = useState(false);

  const [monedaEdit, setMonedaEdit] = useState<"ARS" | "USD">("ARS");
  const [cuentaEdit, setCuentaEdit] = useState("");
  const [conFechaEdit, setConFechaEdit] = useState(false);

  const [categoriaCobroId, setCategoriaCobroId] = useState("");
  const [cuentaCobro, setCuentaCobro] = useState("");
  const categoriasCargadas = useRef(false);
  const [categorias, setCategorias] = useState<
    { id: string; nombre: string; color: string | null }[]
  >([]);

  const cuentasFiltradas = (m: "ARS" | "USD") =>
    cuentas.filter((c) => c.moneda === m);

  useEffect(() => {
    if ((!openNuevo && !cobrarItem) || categoriasCargadas.current) return;
    obtenerCategoriasAction().then((data) => {
      setCategorias(data);
      categoriasCargadas.current = true;
    });
  }, [openNuevo, cobrarItem]);

  useEffect(() => {
    if (!editItem) return;
    setMonedaEdit(editItem.moneda);
    setCuentaEdit(editItem.cuenta_id);
    setConFechaEdit(!!editItem.fecha_esperada);
  }, [editItem]);

  useEffect(() => {
    if (!openNuevo) return;
    const list = cuentasFiltradas(monedaNuevo);
    if (list.length && !list.some((c) => c.id === cuentaNuevo)) {
      setCuentaNuevo(list[0].id);
    }
  }, [openNuevo, monedaNuevo, cuentas, cuentaNuevo]);

  useEffect(() => {
    if (!editItem) return;
    const list = cuentasFiltradas(monedaEdit);
    if (list.length && !list.some((c) => c.id === cuentaEdit)) {
      setCuentaEdit(list[0].id);
    }
  }, [editItem, monedaEdit, cuentas, cuentaEdit]);

  function handleEliminar(row: IngresoFuturoListItem) {
    if (
      !confirm(
        "¿Eliminar este ingreso pendiente? No se borra ninguna transacción ya registrada."
      )
    )
      return;
    startTransition(async () => {
      const res = await eliminarIngresoFuturo(row.id);
      if ("error" in res && res.error) toast.error(res.error);
      else {
        toast.success("Eliminado.");
        router.refresh();
      }
    });
  }

  function abrirCobrar(row: IngresoFuturoListItem) {
    setCategoriaCobroId("");
    setCuentaCobro(row.cuenta_id);
    setCobrarItem(row);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          onClick={() => {
            setMonedaNuevo("ARS");
            const ars = cuentasFiltradas("ARS");
            setCuentaNuevo(ars[0]?.id ?? "");
            setConFechaEsperada(false);
            setOpenNuevo(true);
          }}
          className="gap-2"
          disabled={cuentas.length === 0}
        >
          <Plus className="h-4 w-4" />
          Nuevo ingreso pendiente
        </Button>
      </div>

      {cuentas.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Sin cuentas disponibles.</AlertDescription>
        </Alert>
      )}

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Pendientes
        </h2>

        {pendientesInicial.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Sin pendientes.</CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Cuenta destino</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha esperada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendientesInicial.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {row.descripcion?.trim() || "Sin descripción"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.cuenta_nombre}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-400/95">
                      {formatCurrency(row.monto, row.moneda)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fechaLabel(row.fecha_esperada)}
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1"
                        onClick={() => abrirCobrar(row)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Cobrar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 px-2"
                        onClick={() => setEditItem(row)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-rose-400 px-2"
                        onClick={() => handleEliminar(row)}
                        disabled={isPending}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {cobrados.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Cobrados recientes
          </h2>
          <div className="rounded-xl border border-border overflow-x-auto opacity-90">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha del ingreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cobrados.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[200px] truncate">
                      {row.descripcion?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.cuenta_nombre}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(row.monto, row.moneda)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {fechaLabel(
                        row.fecha_cobro ??
                          (row.cobrado_at
                            ? row.cobrado_at.slice(0, 10)
                            : null)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Nuevo */}
      <Dialog open={openNuevo} onOpenChange={setOpenNuevo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-400" />
              Ingreso por cobrar
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("moneda", monedaNuevo);
              fd.set("cuenta_id", cuentaNuevo);
              if (!conFechaEsperada) fd.delete("fecha_esperada");
              const m = parseFormDecimal(fd.get("monto"));
              if (isNaN(m) || m <= 0) {
                toast.error("Ingresá un monto válido.");
                return;
              }
              fd.set("monto", String(m));
              startTransition(async () => {
                const res = await crearIngresoFuturo(fd);
                if ("error" in res && res.error) toast.error(res.error);
                else {
                  toast.success("Ingreso pendiente guardado.");
                  setOpenNuevo(false);
                  router.refresh();
                }
              });
            }}
          >
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={monedaNuevo}
                onValueChange={(v) => {
                  setMonedaNuevo(v as "ARS" | "USD");
                  const list = cuentasFiltradas(v as "ARS" | "USD");
                  setCuentaNuevo(list[0]?.id ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cuenta donde va a ingresar</Label>
              <Select value={cuentaNuevo} onValueChange={setCuentaNuevo}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentasFiltradas(monedaNuevo).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="if-monto">Monto esperado</Label>
              <Input
                id="if-monto"
                name="monto"
                inputMode="decimal"
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="if-desc">Descripción (opcional)</Label>
              <Input
                id="if-desc"
                name="descripcion"
                placeholder="Ej.: factura cliente X"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="if-confecha"
                checked={conFechaEsperada}
                onChange={(e) => setConFechaEsperada(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="if-confecha" className="font-normal cursor-pointer">
                Sé más o menos cuándo espero cobrarlo
              </Label>
            </div>
            {conFechaEsperada && (
              <div className="space-y-2">
                <Label htmlFor="if-fecha">Fecha esperada</Label>
                <Input
                  id="if-fecha"
                  name="fecha_esperada"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenNuevo(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !cuentaNuevo}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar pendiente */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          {editItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-muted-foreground" />
                  Editar ingreso pendiente
                </DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  fd.set("moneda", monedaEdit);
                  fd.set("cuenta_id", cuentaEdit);
                  if (!conFechaEdit) fd.delete("fecha_esperada");
                  const m = parseFormDecimal(fd.get("monto"));
                  if (isNaN(m) || m <= 0) {
                    toast.error("Ingresá un monto válido.");
                    return;
                  }
                  fd.set("monto", String(m));
                  startTransition(async () => {
                    const res = await editarIngresoFuturo(fd);
                    if ("error" in res && res.error) toast.error(res.error);
                    else {
                      toast.success("Cambios guardados.");
                      setEditItem(null);
                      router.refresh();
                    }
                  });
                }}
              >
                <input type="hidden" name="ingreso_futuro_id" value={editItem.id} />

                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={monedaEdit}
                    onValueChange={(v) => {
                      setMonedaEdit(v as "ARS" | "USD");
                      const list = cuentasFiltradas(v as "ARS" | "USD");
                      setCuentaEdit(list[0]?.id ?? "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cuenta donde va a ingresar</Label>
                  <Select value={cuentaEdit} onValueChange={setCuentaEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasFiltradas(monedaEdit).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ed-monto">Monto esperado</Label>
                  <Input
                    id="ed-monto"
                    name="monto"
                    inputMode="decimal"
                    key={editItem.id}
                    defaultValue={String(editItem.monto)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ed-desc">Descripción (opcional)</Label>
                  <Input
                    id="ed-desc"
                    name="descripcion"
                    placeholder="Ej.: factura cliente X"
                    defaultValue={editItem.descripcion ?? ""}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ed-confecha"
                    checked={conFechaEdit}
                    onChange={(e) => setConFechaEdit(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="ed-confecha" className="font-normal cursor-pointer">
                    Sé más o menos cuándo espero cobrarlo
                  </Label>
                </div>
                {conFechaEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="ed-fecha">Fecha esperada</Label>
                    <Input
                      id="ed-fecha"
                      name="fecha_esperada"
                      type="date"
                      key={`${editItem.id}-fecha`}
                      defaultValue={
                        editItem.fecha_esperada ??
                        new Date().toISOString().slice(0, 10)
                      }
                    />
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditItem(null)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending || !cuentaEdit}>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Guardar cambios"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cobrar */}
      <Dialog open={!!cobrarItem} onOpenChange={(o) => !o && setCobrarItem(null)}>
        <DialogContent className="sm:max-w-md">
          {cobrarItem && (
            <>
              <DialogHeader>
                <DialogTitle>Registrar cobro</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const m = parseFormDecimal(fd.get("monto"));
                  if (isNaN(m) || m <= 0) {
                    toast.error("Ingresá un monto válido.");
                    return;
                  }
                  fd.set("monto", String(m));
                  if (categoriaCobroId) fd.set("categoria_id", categoriaCobroId);
                  startTransition(async () => {
                    const res = await cobrarIngresoFuturo(fd);
                    if ("error" in res && res.error) toast.error(res.error);
                    else {
                      toast.success("¡Ingreso registrado!");
                      setCobrarItem(null);
                      router.refresh();
                    }
                  });
                }}
              >
                <input
                  type="hidden"
                  name="ingreso_futuro_id"
                  value={cobrarItem.id}
                />

                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    name="monto"
                    inputMode="decimal"
                    key={cobrarItem.id}
                    defaultValue={String(cobrarItem.monto)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cuenta</Label>
                  <input type="hidden" name="cuenta_id" value={cuentaCobro} />
                  <Select value={cuentaCobro} onValueChange={setCuentaCobro}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasFiltradas(cobrarItem.moneda).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cobro-fecha">Fecha del ingreso</Label>
                  <Input
                    id="cobro-fecha"
                    name="fecha"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción (opcional)</Label>
                  <Input
                    name="descripcion"
                    placeholder={cobrarItem.descripcion ?? "Ingreso"}
                    defaultValue={cobrarItem.descripcion ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoría (opcional)</Label>
                  <CategoriaCombobox
                    categorias={categorias}
                    value={categoriaCobroId}
                    onChange={setCategoriaCobroId}
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCobrarItem(null)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Registrar ingreso"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
