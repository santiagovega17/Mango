"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoriaCombobox } from "@/components/categoria-combobox";
import type { CuentaResumen, GastoFijoListItem } from "@/lib/data";
import {
  crearGastoFijo,
  editarGastoFijo,
  eliminarGastoFijo,
  obtenerCategoriasAction,
} from "@/lib/actions";
import { parseFormDecimal } from "@/lib/form-numbers";
import { formatCurrency } from "@/lib/utils";

interface Props {
  gastos: GastoFijoListItem[];
  cuentas: CuentaResumen[];
}

function fechaLabel(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

export function GastosFijosPanel({ gastos, cuentas }: Props) {
  const router = useRouter();
  const [openNuevo, setOpenNuevo] = useState(false);
  const [editItem, setEditItem] = useState<GastoFijoListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const [monedaNuevo, setMonedaNuevo] = useState<"ARS" | "USD">("ARS");
  const [cuentaNuevo, setCuentaNuevo] = useState("");

  const [monedaEdit, setMonedaEdit] = useState<"ARS" | "USD">("ARS");
  const [cuentaEdit, setCuentaEdit] = useState("");
  const [activoEdit, setActivoEdit] = useState(true);

  const [categorias, setCategorias] = useState<
    { id: string; nombre: string; color: string | null }[]
  >([]);
  const [categoriaNuevoId, setCategoriaNuevoId] = useState("");
  const [categoriaEditId, setCategoriaEditId] = useState("");
  const categoriasCargadas = useRef(false);

  const cuentasPorMoneda = (m: "ARS" | "USD") =>
    cuentas.filter((c) => c.moneda === m);

  useEffect(() => {
    if ((!openNuevo && !editItem) || categoriasCargadas.current) return;
    obtenerCategoriasAction().then((rows) => {
      setCategorias(rows);
      categoriasCargadas.current = true;
    });
  }, [openNuevo, editItem]);

  useEffect(() => {
    if (!openNuevo) return;
    const list = cuentasPorMoneda(monedaNuevo);
    if (list.length && !list.some((x) => x.id === cuentaNuevo)) {
      setCuentaNuevo(list[0].id);
    }
  }, [openNuevo, monedaNuevo, cuentaNuevo, cuentas]);

  useEffect(() => {
    if (!editItem) return;
    setMonedaEdit(editItem.moneda);
    setCuentaEdit(editItem.cuenta_id);
    setActivoEdit(editItem.activo);
    setCategoriaEditId(editItem.categoria_id ?? "");
  }, [editItem]);

  useEffect(() => {
    if (!editItem) return;
    const list = cuentasPorMoneda(monedaEdit);
    if (list.length && !list.some((x) => x.id === cuentaEdit)) {
      setCuentaEdit(list[0].id);
    }
  }, [editItem, monedaEdit, cuentaEdit, cuentas]);

  function handleEliminar(row: GastoFijoListItem) {
    if (
      !confirm(
        "¿Eliminar este gasto fijo? Las transacciones ya generadas no se borran."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await eliminarGastoFijo(row.id);
      if ("error" in res && res.error) toast.error(res.error);
      else {
        toast.success("Gasto fijo eliminado.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          className="gap-2"
          onClick={() => {
            setMonedaNuevo("ARS");
            setCuentaNuevo(cuentasPorMoneda("ARS")[0]?.id ?? "");
            setCategoriaNuevoId("");
            setOpenNuevo(true);
          }}
          disabled={cuentas.length === 0}
        >
          <Plus className="h-4 w-4" />
          Nuevo gasto fijo
        </Button>
      </div>

      {cuentas.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Sin cuentas disponibles.</AlertDescription>
        </Alert>
      )}

      {gastos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Sin gastos fijos.</CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Próximo débito</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium max-w-[220px] truncate">
                    {g.descripcion}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {g.cuenta_nombre}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    Día {g.dia_mes}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fechaLabel(g.proxima_fecha)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-rose-300">
                    {formatCurrency(g.monto, g.moneda)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        g.activo
                          ? "text-emerald-400 text-xs font-medium"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {g.activo ? "Activo" : "Pausado"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2"
                      onClick={() => setEditItem(g)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-muted-foreground hover:text-rose-400"
                      onClick={() => handleEliminar(g)}
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

      <Dialog open={openNuevo} onOpenChange={setOpenNuevo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo gasto fijo mensual</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("moneda", monedaNuevo);
              fd.set("cuenta_id", cuentaNuevo);
              if (categoriaNuevoId) fd.set("categoria_id", categoriaNuevoId);
              const monto = parseFormDecimal(fd.get("monto"));
              if (isNaN(monto) || monto <= 0) {
                toast.error("Ingresá un monto válido.");
                return;
              }
              fd.set("monto", String(monto));

              startTransition(async () => {
                const res = await crearGastoFijo(fd);
                if ("error" in res && res.error) toast.error(res.error);
                else {
                  toast.success("Gasto fijo creado.");
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
                  const m = v as "ARS" | "USD";
                  setMonedaNuevo(m);
                  setCuentaNuevo(cuentasPorMoneda(m)[0]?.id ?? "");
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
              <Label>Cuenta</Label>
              <Select value={cuentaNuevo} onValueChange={setCuentaNuevo}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentasPorMoneda(monedaNuevo).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gf-desc">Descripción</Label>
              <Input id="gf-desc" name="descripcion" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="gf-monto">Monto</Label>
                <Input id="gf-monto" name="monto" inputMode="decimal" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gf-dia">Día del mes</Label>
                <Input
                  id="gf-dia"
                  name="dia_mes"
                  type="number"
                  min={1}
                  max={31}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gf-inicio">Fecha de inicio</Label>
              <Input
                id="gf-inicio"
                name="fecha_inicio"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría (opcional)</Label>
              <CategoriaCombobox
                categorias={categorias}
                value={categoriaNuevoId}
                onChange={setCategoriaNuevoId}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNuevo(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !cuentaNuevo}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          {editItem && (
            <>
              <DialogHeader>
                <DialogTitle>Editar gasto fijo</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  fd.set("gasto_fijo_id", editItem.id);
                  fd.set("moneda", monedaEdit);
                  fd.set("cuenta_id", cuentaEdit);
                  fd.set("activo", activoEdit ? "1" : "0");
                  if (categoriaEditId) fd.set("categoria_id", categoriaEditId);
                  const monto = parseFormDecimal(fd.get("monto"));
                  if (isNaN(monto) || monto <= 0) {
                    toast.error("Ingresá un monto válido.");
                    return;
                  }
                  fd.set("monto", String(monto));
                  startTransition(async () => {
                    const res = await editarGastoFijo(fd);
                    if ("error" in res && res.error) toast.error(res.error);
                    else {
                      toast.success("Gasto fijo actualizado.");
                      setEditItem(null);
                      router.refresh();
                    }
                  });
                }}
              >
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={monedaEdit}
                    onValueChange={(v) => {
                      const m = v as "ARS" | "USD";
                      setMonedaEdit(m);
                      setCuentaEdit(cuentasPorMoneda(m)[0]?.id ?? "");
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
                  <Label>Cuenta</Label>
                  <Select value={cuentaEdit} onValueChange={setCuentaEdit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasPorMoneda(monedaEdit).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="egf-desc">Descripción</Label>
                  <Input
                    id="egf-desc"
                    name="descripcion"
                    defaultValue={editItem.descripcion}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="egf-monto">Monto</Label>
                    <Input
                      id="egf-monto"
                      name="monto"
                      inputMode="decimal"
                      defaultValue={String(editItem.monto)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="egf-dia">Día del mes</Label>
                    <Input
                      id="egf-dia"
                      name="dia_mes"
                      type="number"
                      min={1}
                      max={31}
                      defaultValue={String(editItem.dia_mes)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="egf-inicio">Fecha de inicio</Label>
                  <Input
                    id="egf-inicio"
                    name="fecha_inicio"
                    type="date"
                    defaultValue={editItem.fecha_inicio}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoría (opcional)</Label>
                  <CategoriaCombobox
                    categorias={categorias}
                    value={categoriaEditId}
                    onChange={setCategoriaEditId}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={activoEdit}
                    onChange={(e) => setActivoEdit(e.target.checked)}
                    className="rounded border-border"
                  />
                  Activo
                </label>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending || !cuentaEdit}>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Guardar"
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
