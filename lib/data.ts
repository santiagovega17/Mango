/**
 * Funciones de consulta al servidor (solo pueden llamarse desde Server Components o Server Actions).
 * Cada función crea su propio cliente de Supabase con las cookies de la sesión activa.
 */

import { createClient } from "@/lib/supabase/server";
import type { MonedaTipo, TransaccionTipo } from "@/lib/supabase/types";

// ── Tipos internos ───────────────────────────────────────────────────────────

export interface CuentaResumen {
  id: string;
  nombre: string;
  tipo: string;
  moneda: MonedaTipo;
  saldo_inicial: number;
}

export interface TransaccionReciente {
  id: string;
  monto: number;
  tipo: TransaccionTipo;
  moneda: MonedaTipo;
  descripcion: string | null;
  fecha: string;
  categoria_nombre: string | null;
  cuenta_nombre: string | null;
}

/** Cuentas que suman al "Saldo disponible" (excluye inversión y similares). */
export const TIPOS_CUENTA_LIQUIDEZ = new Set([
  "efectivo",
  "banco",
  "billetera_virtual",
]);

export function esCuentaLiquidez(tipo: string): boolean {
  return TIPOS_CUENTA_LIQUIDEZ.has(tipo.trim().toLowerCase());
}

export interface DashboardData {
  /** Saldo solo cuentas Efectivo / Banco / Billetera virtual + sus movimientos */
  saldoDisponibleARS: number;
  saldoDisponibleUSD: number;
  /** Valor de mercado por moneda: cantidad × (precio_actual o precio_compra si falta actual) */
  totalInvertidoARS: number;
  totalInvertidoUSD: number;
  /** Suma en ARS usando Dólar Blue (venta); null si no hay cotización */
  totalInvertidoEnARS: number | null;
  /** Liquidez + inversiones en ARS unificado; null si no hay cotización */
  patrimonioNetoEnARS: number | null;
  cotizacionBlueVenta: number | null;
  ingresosARS: number;
  ingresosUSD: number;
  egresosARS: number;
  egresosUSD: number;
  cuentas: CuentaResumen[];
  transaccionesRecientes: TransaccionReciente[];
  mesActual: string; // "Abril 2026"
}

// ── Helper: nombre del mes actual ────────────────────────────────────────────

function getMesActual(): string {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// ── Rango del mes actual en formato ISO ──────────────────────────────────────

function getRangoMesActual(): { desde: string; hasta: string } {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth();

  const desde = new Date(anio, mes, 1).toISOString().split("T")[0];
  const hasta = new Date(anio, mes + 1, 0).toISOString().split("T")[0];

  return { desde, hasta };
}

// ── Query principal del dashboard ────────────────────────────────────────────

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const { desde, hasta } = getRangoMesActual();

  // Ejecutamos todas las queries en paralelo para minimizar latencia
  const [cuentasResult, txTodoResult, txMesResult, txRecentResult, invResult, dolarBlue] =
    await Promise.all([
      // 1. Todas las cuentas del usuario
      supabase
        .from("cuentas")
        .select("id, nombre, tipo, moneda, saldo_inicial")
        .eq("usuario_id", userId)
        .order("created_at", { ascending: true }),

      // 2. Todas las transacciones (para calcular saldo disponible por cuenta)
      supabase
        .from("transacciones")
        .select("monto, tipo, moneda, cuenta_id")
        .eq("usuario_id", userId),

      // 3. Transacciones del mes actual (para ingresos/egresos del mes)
      supabase
        .from("transacciones")
        .select("monto, tipo, moneda")
        .eq("usuario_id", userId)
        .gte("fecha", desde)
        .lte("fecha", hasta),

      // 4. Últimas 6 transacciones para la tabla de actividad reciente
      supabase
        .from("transacciones")
        .select(
          "id, monto, tipo, moneda, descripcion, fecha, categorias(nombre), cuentas(nombre)"
        )
        .eq("usuario_id", userId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),

      // 5. Inversiones (valor de mercado para totales)
      supabase
        .from("inversiones")
        .select("cantidad, precio_compra, precio_actual, moneda")
        .eq("usuario_id", userId),

      fetchDolarBlue(),
    ]);

  const cuentas = (cuentasResult.data ?? []) as CuentaResumen[];
  const txTodo = txTodoResult.data ?? [];
  const txMes = txMesResult.data ?? [];
  const txRecent = txRecentResult.data ?? [];
  const inversionesRows = invResult.data ?? [];

  const idsLiquidez = new Set(
    cuentas.filter((c) => esCuentaLiquidez(c.tipo)).map((c) => c.id)
  );

  const txLiquidez = txTodo.filter(
    (t: { cuenta_id?: string }) =>
      t.cuenta_id != null && idsLiquidez.has(String(t.cuenta_id))
  );

  // ── Saldo inicial solo cuentas de liquidez ─────────────────────────────────
  const saldoInicialLiquidezARS = cuentas
    .filter((c) => c.moneda === "ARS" && esCuentaLiquidez(c.tipo))
    .reduce((acc, c) => acc + Number(c.saldo_inicial), 0);

  const saldoInicialLiquidezUSD = cuentas
    .filter((c) => c.moneda === "USD" && esCuentaLiquidez(c.tipo))
    .reduce((acc, c) => acc + Number(c.saldo_inicial), 0);

  // ── Calcular movimientos acumulados por moneda (solo cuentas de liquidez) ────
  function calcBalance(
    txs: { monto: number; tipo: string; moneda: string }[],
    moneda: string
  ) {
    return txs
      .filter((t) => t.moneda === moneda)
      .reduce((acc, t) => {
        if (t.tipo === "ingreso") return acc + Number(t.monto);
        if (t.tipo === "egreso") return acc - Number(t.monto);
        return acc; // transferencias no afectan el total neto
      }, 0);
  }

  const saldoDisponibleARS =
    saldoInicialLiquidezARS + calcBalance(txLiquidez, "ARS");
  const saldoDisponibleUSD =
    saldoInicialLiquidezUSD + calcBalance(txLiquidez, "USD");

  // ── Valor invertido: cantidad × precio_actual (si existe; si no, precio_compra) ─
  let totalInvertidoARS = 0;
  let totalInvertidoUSD = 0;
  for (const row of inversionesRows as {
    cantidad: number | string;
    precio_compra: number | string;
    precio_actual: number | string | null;
    moneda: string;
  }[]) {
    const cantidad = Number(row.cantidad);
    const pu =
      row.precio_actual != null && row.precio_actual !== ""
        ? Number(row.precio_actual)
        : Number(row.precio_compra);
    if (!cantidad || cantidad <= 0 || !pu || pu < 0) continue;
    const valor = cantidad * pu;
    if (row.moneda === "USD") totalInvertidoUSD += valor;
    else totalInvertidoARS += valor;
  }

  const blueVenta = dolarBlue?.venta ?? null;
  const totalInvertidoEnARS =
    blueVenta != null && blueVenta > 0
      ? totalInvertidoARS + totalInvertidoUSD * blueVenta
      : null;

  const liquidezEnARS =
    blueVenta != null && blueVenta > 0
      ? saldoDisponibleARS + saldoDisponibleUSD * blueVenta
      : null;

  const patrimonioNetoEnARS =
    totalInvertidoEnARS != null && liquidezEnARS != null
      ? liquidezEnARS + totalInvertidoEnARS
      : null;

  // ── Ingresos y egresos del mes ─────────────────────────────────────────────
  function sumarPorTipo(
    txs: { monto: number; tipo: string; moneda: string }[],
    tipo: string,
    moneda: string
  ) {
    return txs
      .filter((t) => t.tipo === tipo && t.moneda === moneda)
      .reduce((acc, t) => acc + Number(t.monto), 0);
  }

  const ingresosARS = sumarPorTipo(txMes, "ingreso", "ARS");
  const ingresosUSD = sumarPorTipo(txMes, "ingreso", "USD");
  const egresosARS = sumarPorTipo(txMes, "egreso", "ARS");
  const egresosUSD = sumarPorTipo(txMes, "egreso", "USD");

  // ── Formatear transacciones recientes ─────────────────────────────────────
  const transaccionesRecientes: TransaccionReciente[] = txRecent.map((t: any) => ({
    id: t.id,
    monto: Number(t.monto),
    tipo: t.tipo as TransaccionTipo,
    moneda: t.moneda as MonedaTipo,
    descripcion: t.descripcion ?? null,
    fecha: t.fecha,
    categoria_nombre: t.categorias?.nombre ?? null,
    cuenta_nombre: t.cuentas?.nombre ?? null,
  }));

  return {
    saldoDisponibleARS,
    saldoDisponibleUSD,
    totalInvertidoARS,
    totalInvertidoUSD,
    totalInvertidoEnARS,
    patrimonioNetoEnARS,
    cotizacionBlueVenta: blueVenta,
    ingresosARS,
    ingresosUSD,
    egresosARS,
    egresosUSD,
    cuentas,
    transaccionesRecientes,
    mesActual: getMesActual(),
  };
}

// ── Query completa de transacciones ──────────────────────────────────────────

export interface TransaccionCompleta {
  id: string;
  monto: number;
  tipo: TransaccionTipo;
  moneda: MonedaTipo;
  descripcion: string | null;
  fecha: string; // "YYYY-MM-DD"
  categoria_nombre: string | null;
  categoria_color: string | null;
  cuenta_nombre: string | null;
  cuenta_id: string;
  categoria_id: string | null;
}

export async function getTransacciones(
  userId: string
): Promise<TransaccionCompleta[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("transacciones")
    .select(
      "id, monto, tipo, moneda, descripcion, fecha, cuenta_id, categoria_id, categorias(nombre, color), cuentas(nombre)"
    )
    .eq("usuario_id", userId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map((t: any) => ({
    id: t.id,
    monto: Number(t.monto),
    tipo: t.tipo as TransaccionTipo,
    moneda: t.moneda as MonedaTipo,
    descripcion: t.descripcion ?? null,
    fecha: t.fecha,
    categoria_nombre: t.categorias?.nombre ?? null,
    categoria_color: t.categorias?.color ?? null,
    cuenta_nombre: t.cuentas?.nombre ?? null,
    cuenta_id: t.cuenta_id,
    categoria_id: t.categoria_id ?? null,
  }));
}

// ── Query de categorías ───────────────────────────────────────────────────────

export interface CategoriaItem {
  id: string;
  nombre: string;
  icono: string | null;
  color: string | null;
}

export async function getCategorias(): Promise<CategoriaItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("categorias")
    .select("id, nombre, icono, color")
    .order("nombre", { ascending: true });

  return (data ?? []) as CategoriaItem[];
}

// ── Query de inversiones ──────────────────────────────────────────────────────

export interface InversionItem {
  id: string;
  nombre_activo: string;
  tipo_activo: string;
  cantidad: number;
  precio_compra: number;
  precio_actual: number | null;
  moneda: MonedaTipo;
}

export async function getInversiones(
  userId: string
): Promise<InversionItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("inversiones")
    .select(
      "id, nombre_activo, tipo_activo, cantidad, precio_compra, precio_actual, moneda"
    )
    .eq("usuario_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((i: any) => ({
    id: i.id,
    nombre_activo: i.nombre_activo,
    tipo_activo: i.tipo_activo,
    cantidad: Number(i.cantidad),
    precio_compra: Number(i.precio_compra),
    precio_actual: i.precio_actual != null ? Number(i.precio_actual) : null,
    moneda: i.moneda as MonedaTipo,
  }));
}

// ── Cotización dólar blue desde dolarapi.com ──────────────────────────────────

export interface CotizacionDolar {
  compra: number;
  venta: number;
  nombre: string;
}

export async function fetchDolarBlue(): Promise<CotizacionDolar | null> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: { revalidate: 3600 }, // refrescar cada hora
    });
    if (!res.ok) return null;
    return (await res.json()) as CotizacionDolar;
  } catch {
    return null;
  }
}

// ── Query liviana: solo cuentas (para selects en formularios) ─────────────────

export async function getCuentasUsuario(
  userId: string
): Promise<CuentaResumen[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cuentas")
    .select("id, nombre, tipo, moneda, saldo_inicial")
    .eq("usuario_id", userId)
    .order("created_at", { ascending: true });

  return (data ?? []) as CuentaResumen[];
}
