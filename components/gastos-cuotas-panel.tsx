"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  CreditCard,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
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
  crearGastoCuota,
  editarGastoCuota,
  pagarCuotaGasto,
  eliminarGastoCuota,
  obtenerCategoriasAction,
} from "@/lib/actions";
import { parseFormDecimal } from "@/lib/form-numbers";
import { formatCurrency } from "@/lib/utils";
import type { GastoCuotaListItem, CuentaResumen } from "@/lib/data";

interface Props {
  planes: GastoCuotaListItem[];
  cuentasARS: CuentaResumen[];
}

function estadoBadge(plan: GastoCuotaListItem) {
  if (plan.cuotas_pagadas >= plan.cantidad_cuotas) {
    return <Badge variant="secondary">Completado</Badge>;
  }
  if (!plan.activo) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Cancelado
      </Badge>
    );
  }
  return <Badge>Activo</Badge>;
}

export function GastosCuotasPanel({ planes, cuentasARS }: Props) {
  const router = useRouter();
  const [openNuevo, setOpenNuevo] = useState(false);
  const [editPlan, setEditPlan] = useState<GastoCuotaListItem | null>(null);
  const [pagarPlan, setPagarPlan] = useState<GastoCuotaListItem | null>(null);
  const [fechaPago, setFechaPago] = useState("");
  const [isPending, startTransition] = useTransition();

  const [categorias, setCategorias] = useState<
    { id: string; nombre: string; color: string | null }[]
  >([]);
  const categoriasCargadas = useRef(false);

  useEffect(() => {
    if ((!openNuevo && !editPlan) || categoriasCargadas.current) return;
    obtenerCategoriasAction().then((data) => {
      setCategorias(data);
      categoriasCargadas.current = true;
    });
  }, [openNuevo, editPlan]);

  useEffect(() => {
    if (pagarPlan?.proxima_fecha) setFechaPago(pagarPlan.proxima_fecha);
    else setFechaPago(new Date().toISOString().slice(0, 10));
  }, [pagarPlan]);

  function handleEliminar(plan: GastoCuotaListItem) {
    if (
      !confirm(
        "¿Eliminar este plan? Los egresos que ya registraste no se borran; solo dejan de estar vinculados al plan."
      )
    )
      return;
    startTransition(async () => {
      const res = await eliminarGastoCuota(plan.id);
      if ("error" in res && res.error) toast.error(res.error);
      else {
        toast.success("Plan eliminado.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button onClick={() => setOpenNuevo(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo plan en cuotas
        </Button>
      </div>

      {planes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No tenés planes en cuotas. Creá uno para registrar egresos mes a mes
            en pesos.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-left">Cuota</TableHead>
                <TableHead className="text-left">Progreso</TableHead>
                <TableHead className="text-left">Restante</TableHead>
                <TableHead className="text-left">Próximo</TableHead>
                <TableHead className="text-left">Estado</TableHead>
                <TableHead className="text-left">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planes.map((plan) => {
                const puedePagar =
                  plan.activo && plan.cuotas_pagadas < plan.cantidad_cuotas;
                return (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {plan.descripcion}
                      {plan.categoria_nombre && (
                        <span className="block text-xs text-muted-foreground truncate">
                          {plan.categoria_nombre}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {plan.cuenta_nombre}
                    </TableCell>
                    <TableCell className="text-left tabular-nums">
                      {formatCurrency(plan.monto_cuota, "ARS")}
                    </TableCell>
                    <TableCell className="text-left text-sm tabular-nums">
                      {plan.cuotas_pagadas}/{plan.cantidad_cuotas}
                    </TableCell>
                    <TableCell className="text-left tabular-nums text-sm">
                      {formatCurrency(plan.monto_restante, "ARS")}
                    </TableCell>
                    <TableCell className="text-left text-sm text-muted-foreground whitespace-nowrap">
                      {plan.proxima_fecha ?? "—"}
                    </TableCell>
                    <TableCell className="text-left">{estadoBadge(plan)}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex flex-wrap items-center justify-start gap-1">
                        {puedePagar && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1"
                            disabled={isPending}
                            onClick={() => setPagarPlan(plan)}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Pagar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={isPending}
                          onClick={() => setEditPlan(plan)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={isPending}
                          onClick={() => handleEliminar(plan)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DialogNuevoPlan
        open={openNuevo}
        onOpenChange={setOpenNuevo}
        cuentasARS={cuentasARS}
        categorias={categorias}
        onDone={() => {
          setOpenNuevo(false);
          router.refresh();
        }}
      />

      <DialogEditarPlan
        plan={editPlan}
        open={!!editPlan}
        onOpenChange={(o) => !o && setEditPlan(null)}
        cuentasARS={cuentasARS}
        categorias={categorias}
        onDone={() => {
          setEditPlan(null);
          router.refresh();
        }}
      />

      <Dialog open={!!pagarPlan} onOpenChange={(o) => !o && setPagarPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago de cuota</DialogTitle>
            <DialogDescription>
              Se creará un egreso en ARS vinculado a este plan. Por defecto se
              usa la fecha de la próxima cuota.
            </DialogDescription>
          </DialogHeader>
          {pagarPlan && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("fecha", fechaPago);
                startTransition(async () => {
                  const res = await pagarCuotaGasto(fd);
                  if ("error" in res && res.error) toast.error(res.error);
                  else {
                    toast.success("Cuota registrada.");
                    setPagarPlan(null);
                    router.refresh();
                  }
                });
              }}
            >
              <input type="hidden" name="gasto_cuota_id" value={pagarPlan.id} />
              <div className="space-y-2">
                <Label htmlFor="fecha_cuota">Fecha del egreso</Label>
                <Input
                  id="fecha_cuota"
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Monto:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(pagarPlan.monto_cuota, "ARS")}
                </span>{" "}
                · Cuota {pagarPlan.cuotas_pagadas + 1}/{pagarPlan.cantidad_cuotas}
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPagarPlan(null)}
                >
                  Cerrar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Guardando…
                    </>
                  ) : (
                    "Confirmar pago"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DialogNuevoPlan({
  open,
  onOpenChange,
  cuentasARS,
  categorias,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cuentasARS: CuentaResumen[];
  categorias: { id: string; nombre: string; color: string | null }[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [cuentaId, setCuentaId] = useState(cuentasARS[0]?.id ?? "");
  const [categoriaId, setCategoriaId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && cuentasARS.length > 0 && !cuentaId) {
      setCuentaId(cuentasARS[0].id);
    }
  }, [open, cuentasARS, cuentaId]);

  if (cuentasARS.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo plan en cuotas</DialogTitle>
            <DialogDescription>
              Necesitás al menos una cuenta en pesos (ARS) para crear un plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo plan en cuotas</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const form = e.currentTarget;
            const fd = new FormData(form);
            const monto = parseFormDecimal((fd.get("monto_total") as string) || "");
            if (isNaN(monto) || monto <= 0) {
              setError("El monto total debe ser mayor a 0.");
              return;
            }
            startTransition(async () => {
              const res = await crearGastoCuota(fd);
              if ("error" in res && res.error) {
                setError(res.error);
                return;
              }
              toast.success("Plan creado.");
              form.reset();
              onDone();
            });
          }}
        >
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>Cuenta (ARS)</Label>
            <Select value={cuentaId} onValueChange={setCuentaId} required>
              <SelectTrigger>
                <SelectValue placeholder="Elegí cuenta" />
              </SelectTrigger>
              <SelectContent>
                {cuentasARS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="cuenta_id" value={cuentaId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gc_desc">Descripción</Label>
            <Input
              id="gc_desc"
              name="descripcion"
              placeholder="Ej.: Notebook en 12 cuotas"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gc_monto">Monto total</Label>
              <Input
                id="gc_monto"
                name="monto_total"
                inputMode="decimal"
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gc_n">Cantidad de cuotas</Label>
              <Input
                id="gc_n"
                name="cantidad_cuotas"
                type="number"
                min={1}
                max={600}
                defaultValue={12}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gc_fecha">Primera cuota</Label>
            <Input
              id="gc_fecha"
              name="fecha_primera_cuota"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Categoría (opcional)</Label>
            <CategoriaCombobox
              categorias={categorias}
              value={categoriaId}
              onChange={setCategoriaId}
            />
            <input type="hidden" name="categoria_id" value={categoriaId} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando…
                </>
              ) : (
                "Crear plan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function montoTotalPrefill(plan: GastoCuotaListItem): string {
  const v = Math.round(plan.monto_cuota * plan.cantidad_cuotas * 100) / 100;
  return String(v);
}

function DialogEditarPlan({
  plan,
  open,
  onOpenChange,
  cuentasARS,
  categorias,
  onDone,
}: {
  plan: GastoCuotaListItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cuentasARS: CuentaResumen[];
  categorias: { id: string; nombre: string; color: string | null }[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [cuentaId, setCuentaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (plan) {
      const cuentaValida = cuentasARS.some((c) => c.id === plan.cuenta_id);
      setCuentaId(
        cuentaValida ? plan.cuenta_id : (cuentasARS[0]?.id ?? "")
      );
      setCategoriaId(plan.categoria_id ?? "");
      setError(null);
    }
  }, [plan, cuentasARS]);

  if (!plan) return null;

  if (cuentasARS.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plan</DialogTitle>
            <DialogDescription>
              No tenés cuentas en ARS; no se puede editar la cuenta de este plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar plan en cuotas</DialogTitle>
        </DialogHeader>
        <form
          key={plan.id}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const form = e.currentTarget;
            const fd = new FormData(form);
            fd.set("gasto_cuota_id", plan.id);
            const monto = parseFormDecimal((fd.get("monto_total") as string) || "");
            if (isNaN(monto) || monto <= 0) {
              setError("El monto total debe ser mayor a 0.");
              return;
            }
            startTransition(async () => {
              const res = await editarGastoCuota(fd);
              if ("error" in res && res.error) {
                setError(res.error);
                return;
              }
              toast.success("Plan actualizado.");
              onDone();
            });
          }}
        >
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="gasto_cuota_id" value={plan.id} />
          <div className="space-y-2">
            <Label>Cuenta (ARS)</Label>
            <Select value={cuentaId} onValueChange={setCuentaId} required>
              <SelectTrigger>
                <SelectValue placeholder="Elegí cuenta" />
              </SelectTrigger>
              <SelectContent>
                {cuentasARS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="cuenta_id" value={cuentaId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_desc">Descripción</Label>
            <Input
              id="edit_desc"
              name="descripcion"
              defaultValue={plan.descripcion}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit_monto">Monto total</Label>
              <Input
                id="edit_monto"
                name="monto_total"
                inputMode="decimal"
                defaultValue={montoTotalPrefill(plan)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_n">Cantidad de cuotas</Label>
              <Input
                id="edit_n"
                name="cantidad_cuotas"
                type="number"
                min={plan.cuotas_pagadas}
                max={600}
                defaultValue={plan.cantidad_cuotas}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cuotas ya pagadas: {plan.cuotas_pagadas}. La cantidad no puede ser
            menor a eso.
          </p>
          <div className="space-y-2">
            <Label htmlFor="edit_fecha">Primera cuota</Label>
            <Input
              id="edit_fecha"
              name="fecha_primera_cuota"
              type="date"
              defaultValue={plan.fecha_primera_cuota}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Categoría (opcional)</Label>
            <CategoriaCombobox
              categorias={categorias}
              value={categoriaId}
              onChange={setCategoriaId}
            />
            <input type="hidden" name="categoria_id" value={categoriaId} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando…
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
