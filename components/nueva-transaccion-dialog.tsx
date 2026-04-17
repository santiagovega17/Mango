"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { CategoriaCombobox } from "@/components/categoria-combobox";
import {
  crearTransaccion,
  obtenerCuentasAction,
  obtenerCategoriasAction,
} from "@/lib/actions";
import type { CuentaResumen } from "@/lib/data";

type TipoTx = "ingreso" | "egreso";

interface Props {
  cuentasIniciales?: CuentaResumen[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  compact?: boolean;
}

export function NuevaTransaccionDialog({
  cuentasIniciales,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  compact = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(value: boolean) {
    if (isControlled) controlledOnOpenChange?.(value);
    else setInternalOpen(value);
  }

  const [tipo, setTipo] = useState<TipoTx>("egreso");
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [cuentaId, setCuentaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // ── Cuentas ───────────────────────────────────────────────────────────────
  const [cuentas, setCuentas] = useState<CuentaResumen[]>(
    cuentasIniciales ?? []
  );
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const cuentasCargadas = useRef(!!cuentasIniciales?.length);

  // ── Categorías ────────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<
    { id: string; nombre: string; color: string | null }[]
  >([]);
  const categoriasCargadas = useRef(false);

  async function cargarDatos() {
    const promises: Promise<void>[] = [];

    if (!cuentasCargadas.current) {
      setLoadingCuentas(true);
      promises.push(
        obtenerCuentasAction().then((data) => {
          setCuentas(data);
          cuentasCargadas.current = true;
          if (data.length > 0) setCuentaId(data[0].id);
          setLoadingCuentas(false);
        })
      );
    }

    if (!categoriasCargadas.current) {
      promises.push(
        obtenerCategoriasAction().then((data) => {
          setCategorias(data);
          categoriasCargadas.current = true;
        })
      );
    }

    await Promise.all(promises);
  }

  useEffect(() => {
    if (open) {
      cargarDatos();
      if (cuentas.length > 0 && !cuentaId) setCuentaId(cuentas[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function resetForm() {
    formRef.current?.reset();
    setTipo("egreso");
    setMoneda("ARS");
    setCuentaId(cuentas[0]?.id ?? "");
    setCategoriaId("");
    setError(null);
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    setOpen(val);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!cuentaId) {
      setError("Seleccioná una cuenta.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("tipo", tipo);
    formData.set("moneda", moneda);
    formData.set("cuenta_id", cuentaId);
    if (categoriaId) formData.set("categoria_id", categoriaId);

    startTransition(async () => {
      const result = await crearTransaccion(formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(
          tipo === "ingreso"
            ? "¡Ingreso registrado!"
            : "¡Egreso registrado!"
        );
        handleOpenChange(false);
      }
    });
  }

  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId);
  const hoy = new Date().toISOString().split("T")[0];

  return (
    <>
      {!isControlled && (
        <Button
          onClick={() => setOpen(true)}
          size={compact ? "icon" : "sm"}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          {!compact && "Nueva transacción"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nueva transacción
            </DialogTitle>
            <DialogDescription>
              Registrá un ingreso o egreso en cualquiera de tus cuentas.
            </DialogDescription>
          </DialogHeader>

          {!loadingCuentas && cuentas.length === 0 && (
            <Alert variant="warning" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Primero necesitás{" "}
                <strong>crear al menos una cuenta</strong> para registrar
                transacciones.
              </AlertDescription>
            </Alert>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-1">
            {/* Tipo */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Tipo
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo("ingreso")}
                  className={`flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition-all ${
                    tipo === "ingreso"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-secondary/50 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("egreso")}
                  className={`flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition-all ${
                    tipo === "egreso"
                      ? "border-rose-500 bg-rose-500/10 text-rose-400"
                      : "border-border bg-secondary/50 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Egreso
                </button>
              </div>
            </div>

            {/* Monto + Moneda */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Monto
              </Label>
              <div className="flex gap-2">
                <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
                  {(["ARS", "USD"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMoneda(m)}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${
                        moneda === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <Input
                  name="monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                  className="bg-secondary/50 border-border/80 h-11 text-lg font-mono flex-1"
                />
              </div>
            </div>

            {/* Cuenta */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Cuenta
                </Label>
                {loadingCuentas && (
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                )}
              </div>
              <Select
                value={cuentaId}
                onValueChange={setCuentaId}
                disabled={loadingCuentas || cuentas.length === 0}
              >
                <SelectTrigger className="bg-secondary/50 border-border/80 h-11">
                  <SelectValue
                    placeholder={
                      loadingCuentas
                        ? "Cargando…"
                        : cuentas.length === 0
                        ? "Sin cuentas creadas"
                        : "Seleccioná una cuenta…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {cuentas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {c.moneda}
                        </span>
                        {c.nombre}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cuentaSeleccionada &&
                cuentaSeleccionada.moneda !== moneda && (
                  <p className="text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    La cuenta está en {cuentaSeleccionada.moneda} pero la
                    transacción será en {moneda}.
                  </p>
                )}
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Categoría{" "}
                <span className="text-muted-foreground/60 normal-case">
                  (opcional)
                </span>
              </Label>
              <CategoriaCombobox
                categorias={categorias}
                value={categoriaId}
                onChange={setCategoriaId}
                disabled={isPending}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Descripción{" "}
                <span className="text-muted-foreground/60 normal-case">
                  (opcional)
                </span>
              </Label>
              <Input
                name="descripcion"
                placeholder="Ej: Supermercado, Netflix, Sueldo…"
                className="bg-secondary/50 border-border/80 h-11"
              />
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Fecha
              </Label>
              <Input
                name="fecha"
                type="date"
                defaultValue={hoy}
                required
                className="bg-secondary/50 border-border/80 h-11"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || cuentas.length === 0}
                className={`gap-2 ${
                  tipo === "ingreso"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    {tipo === "ingreso" ? (
                      <ArrowUpCircle className="h-4 w-4" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4" />
                    )}
                    Registrar {tipo}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
