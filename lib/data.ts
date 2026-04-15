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

export interface DashboardData {
  saldoTotalARS: number;
  saldoTotalUSD: number;
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
  const [cuentasResult, txTodoResult, txMesResult, txRecentResult] =
    await Promise.all([
      // 1. Todas las cuentas del usuario
      supabase
        .from("cuentas")
        .select("id, nombre, tipo, moneda, saldo_inicial")
        .eq("usuario_id", userId)
        .order("created_at", { ascending: true }),

      // 2. Todas las transacciones (para calcular saldo actual)
      supabase
        .from("transacciones")
        .select("monto, tipo, moneda")
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
    ]);

  const cuentas = (cuentasResult.data ?? []) as CuentaResumen[];
  const txTodo = txTodoResult.data ?? [];
  const txMes = txMesResult.data ?? [];
  const txRecent = txRecentResult.data ?? [];

  // ── Calcular saldo inicial por moneda ──────────────────────────────────────
  const saldoInicialARS = cuentas
    .filter((c) => c.moneda === "ARS")
    .reduce((acc, c) => acc + Number(c.saldo_inicial), 0);

  const saldoInicialUSD = cuentas
    .filter((c) => c.moneda === "USD")
    .reduce((acc, c) => acc + Number(c.saldo_inicial), 0);

  // ── Calcular movimientos acumulados por moneda ─────────────────────────────
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

  const saldoTotalARS =
    saldoInicialARS + calcBalance(txTodo, "ARS");
  const saldoTotalUSD =
    saldoInicialUSD + calcBalance(txTodo, "USD");

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    saldoTotalARS,
    saldoTotalUSD,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
