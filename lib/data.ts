/**
 * Funciones de consulta al servidor (solo pueden llamarse desde Server Components o Server Actions).
 * Cada función crea su propio cliente de Supabase con las cookies de la sesión activa.
 */

import { createClient } from "@/lib/supabase/server";
import type { MonedaTipo, TransaccionTipo } from "@/lib/supabase/types";
import { fechaProximaCuota } from "@/lib/cuotas-utils";
import { esCuentaBrokerInversion } from "@/lib/cuenta-tipo";

// ── Tipos internos ───────────────────────────────────────────────────────────

export interface CuentaResumen {
  id: string;
  nombre: string;
  tipo: string;
  moneda: MonedaTipo;
  saldo_inicial: number;
  /** Saldo actual (inicial + ingresos − egresos en esa cuenta). Lo completa getDashboardData. */
  saldo_disponible?: number;
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
  /**
   * Efectivo / banco / billetera + movimientos, más el efectivo no invertido
   * en cuentas tipo inversión (saldo cuenta − valor mercado posiciones en Mango).
   */
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

/** Fila mínima de transacción para calcular saldo por cuenta. */
type TxSaldoLista = {
  monto: number | string;
  tipo: string;
  moneda: string;
  cuenta_id?: string | null;
};

/** Clave para emparejar cuentas “gemelas” ARS/USD (ej. Astropay + AstroPay (USD)). */
function walletKeyCuenta(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(usd\)\s*$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Saldo de la cuenta en su moneda (inicial + movimientos).
 * - Misma moneda cuenta/transacción: suma ingreso, resta egreso.
 * - Cruzado ARS↔USD: convierte con blue venta (misma lógica que unificar cartera).
 * - tipo transferencia: no ajusta (las transferencias de la app van como ingreso+egreso).
 */
function saldoDisponibleCuenta(
  cuenta: CuentaResumen,
  txs: TxSaldoLista[],
  blue: number | null
): number {
  const base = Number(cuenta.saldo_inicial);
  const idNorm = String(cuenta.id).toLowerCase();
  let delta = 0;
  for (const t of txs) {
    if (t.cuenta_id == null) continue;
    if (String(t.cuenta_id).toLowerCase() !== idNorm) continue;
    const tipo = String(t.tipo ?? "").toLowerCase();
    const sign = tipo === "ingreso" ? 1 : tipo === "egreso" ? -1 : 0;
    if (sign === 0) continue;
    const m = Number(t.monto);
    const txMon = t.moneda === "USD" ? "USD" : "ARS";
    if (txMon === cuenta.moneda) {
      delta += sign * m;
      continue;
    }
    if (blue != null && blue > 0) {
      if (cuenta.moneda === "USD" && txMon === "ARS") {
        delta += sign * (m / blue);
      } else if (cuenta.moneda === "ARS" && txMon === "USD") {
        delta += sign * (m * blue);
      }
    }
  }
  return base + delta;
}

/**
 * Saldo mostrado en listados: si hay par ARS+USD con el mismo nombre base,
 * los movimientos en USD se consolidan en la cuenta en USD.
 */
function saldoCuentaParaListadoDashboard(
  cuenta: CuentaResumen,
  todas: CuentaResumen[],
  txs: TxSaldoLista[],
  blue: number | null
): number {
  const grupos = new Map<string, CuentaResumen[]>();
  for (const c of todas) {
    const k = walletKeyCuenta(c.nombre);
    const arr = grupos.get(k) ?? [];
    arr.push(c);
    grupos.set(k, arr);
  }
  const g = grupos.get(walletKeyCuenta(cuenta.nombre)) ?? [cuenta];
  const vinculado =
    g.length >= 2 &&
    g.some((x) => x.moneda === "USD") &&
    g.some((x) => x.moneda === "ARS");
  if (!vinculado) {
    return saldoDisponibleCuenta(cuenta, txs, blue);
  }

  const idsGrupo = new Set(g.map((c) => String(c.id).toLowerCase()));

  if (cuenta.moneda === "USD") {
    const base = Number(cuenta.saldo_inicial);
    let delta = 0;
    for (const t of txs) {
      if (t.cuenta_id == null) continue;
      const cid = String(t.cuenta_id).toLowerCase();
      if (!idsGrupo.has(cid)) continue;
      const tipo = String(t.tipo ?? "").toLowerCase();
      const sign = tipo === "ingreso" ? 1 : tipo === "egreso" ? -1 : 0;
      if (sign === 0) continue;
      const m = Number(t.monto);
      const txMon = t.moneda === "USD" ? "USD" : "ARS";
      if (txMon === "USD") {
        delta += sign * m;
        continue;
      }
      if (cid !== String(cuenta.id).toLowerCase()) continue;
      if (blue != null && blue > 0 && txMon === "ARS") {
        delta += sign * (m / blue);
      }
    }
    return base + delta;
  }

  const base = Number(cuenta.saldo_inicial);
  const idNorm = String(cuenta.id).toLowerCase();
  let delta = 0;
  for (const t of txs) {
    if (t.cuenta_id == null) continue;
    const cid = String(t.cuenta_id).toLowerCase();
    if (cid !== idNorm) continue;
    const tipo = String(t.tipo ?? "").toLowerCase();
    const sign = tipo === "ingreso" ? 1 : tipo === "egreso" ? -1 : 0;
    if (sign === 0) continue;
    const m = Number(t.monto);
    const txMon = t.moneda === "USD" ? "USD" : "ARS";
    if (txMon === "USD") continue;
    if (txMon === cuenta.moneda) {
      delta += sign * m;
    }
  }
  return base + delta;
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

      // 2. Todas las transacciones (saldo por cuenta; incluye moneda para cruce ARS/USD)
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

      // 5. Inversiones (valor de mercado + cuenta para efectivo no invertido broker)
      supabase
        .from("inversiones")
        .select("cantidad, precio_compra, precio_actual, moneda, cuenta_id")
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

  let saldoDisponibleARS =
    saldoInicialLiquidezARS + calcBalance(txLiquidez, "ARS");
  let saldoDisponibleUSD =
    saldoInicialLiquidezUSD + calcBalance(txLiquidez, "USD");

  // ── Efectivo no invertido en cuentas broker → suma al saldo disponible ───────
  const blueVentaEarly = dolarBlue?.venta ?? null;
  type InvRow = {
    cantidad: number | string;
    precio_compra: number | string;
    precio_actual: number | string | null;
    moneda: string;
    cuenta_id: string | null;
  };
  function valorMercadoPosicionesEnCuenta(
    cuentaId: string,
    rows: InvRow[]
  ): number {
    let sum = 0;
    const idNorm = String(cuentaId).toLowerCase();
    for (const row of rows) {
      if (row.cuenta_id == null) continue;
      if (String(row.cuenta_id).toLowerCase() !== idNorm) continue;
      const cantidad = Number(row.cantidad);
      const pu =
        row.precio_actual != null && row.precio_actual !== ""
          ? Number(row.precio_actual)
          : Number(row.precio_compra);
      if (!cantidad || cantidad <= 0 || !pu || pu < 0) continue;
      sum += cantidad * pu;
    }
    return sum;
  }

  for (const c of cuentas) {
    if (!esCuentaBrokerInversion(c.tipo)) continue;
    const saldoCuenta = saldoCuentaParaListadoDashboard(
      c,
      cuentas,
      txTodo as TxSaldoLista[],
      blueVentaEarly
    );
    const vm = valorMercadoPosicionesEnCuenta(
      c.id,
      inversionesRows as InvRow[]
    );
    const noInvertido = Math.max(0, saldoCuenta - vm);
    if (c.moneda === "USD") saldoDisponibleUSD += noInvertido;
    else saldoDisponibleARS += noInvertido;
  }

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

  /** Orden: más saldo a menos (USD convertido a ARS con blue si hay cotización), tie-break alfabético. */
  function comparableSaldoEnARS(
    c: CuentaResumen & { saldo_disponible: number },
    blue: number | null
  ): number {
    const s = c.saldo_disponible;
    if (c.moneda === "USD" && blue != null && blue > 0) return s * blue;
    if (c.moneda === "USD") return s * 1000;
    return s;
  }

  const cuentasConSaldo: CuentaResumen[] = cuentas.map((c) => ({
    ...c,
    saldo_disponible: saldoCuentaParaListadoDashboard(
      c,
      cuentas,
      txTodo,
      blueVenta
    ),
  }));

  cuentasConSaldo.sort((a, b) => {
    const ca = comparableSaldoEnARS(
      a as CuentaResumen & { saldo_disponible: number },
      blueVenta
    );
    const cb = comparableSaldoEnARS(
      b as CuentaResumen & { saldo_disponible: number },
      blueVenta
    );
    if (cb !== ca) return cb - ca;
    return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
  });

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
    cuentas: cuentasConSaldo,
    transaccionesRecientes,
    mesActual: getMesActual(),
  };
}

/** Cuentas con `saldo_disponible` (misma regla que listado del dashboard). */
export async function getCuentasConSaldoDisponible(
  userId: string
): Promise<CuentaResumen[]> {
  const supabase = await createClient();
  const [cuentasResult, txTodoResult, dolarBlue] = await Promise.all([
    supabase
      .from("cuentas")
      .select("id, nombre, tipo, moneda, saldo_inicial")
      .eq("usuario_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("transacciones")
      .select("monto, tipo, moneda, cuenta_id")
      .eq("usuario_id", userId),
    fetchDolarBlue(),
  ]);

  const cuentas = (cuentasResult.data ?? []) as CuentaResumen[];
  const txTodo = (txTodoResult.data ?? []) as TxSaldoLista[];
  const blueVenta = dolarBlue?.venta ?? null;

  return cuentas.map((c) => ({
    ...c,
    saldo_disponible: saldoCuentaParaListadoDashboard(
      c,
      cuentas,
      txTodo,
      blueVenta
    ),
  }));
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
  cuenta_id: string | null;
  cuenta_nombre: string | null;
}

export async function getInversiones(
  userId: string
): Promise<InversionItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("inversiones")
    .select(
      "id, nombre_activo, tipo_activo, cantidad, precio_compra, precio_actual, moneda, cuenta_id, cuentas(nombre)"
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
    cuenta_id: i.cuenta_id ?? null,
    cuenta_nombre: i.cuentas?.nombre ?? null,
  }));
}

/** Cartera agrupada por cuenta broker (inversión). */
export interface CarteraPorBroker {
  cuenta_id: string;
  cuenta_nombre: string;
  moneda: MonedaTipo;
  /** Saldo de la cuenta (inicial + movimientos). */
  saldo_cuenta: number;
  /** Suma cantidad × precio mercado (o compra si no hay actual). */
  valor_mercado_posiciones: number;
  /** saldo_cuenta − valor_mercado_posiciones (estimado en Mango). */
  no_invertido: number;
  inversiones: InversionItem[];
}

export async function getCarteraInversionesPorBroker(
  userId: string
): Promise<{ brokers: CarteraPorBroker[]; sinBroker: InversionItem[] }> {
  const [cuentasConSaldo, inversiones] = await Promise.all([
    getCuentasConSaldoDisponible(userId),
    getInversiones(userId),
  ]);

  const cuentasBroker = cuentasConSaldo
    .filter((c) => esCuentaBrokerInversion(c.tipo))
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
    );

  const sinBroker = inversiones.filter((i) => i.cuenta_id == null);

  const brokers: CarteraPorBroker[] = cuentasBroker.map((c) => {
    const invs = inversiones.filter((i) => i.cuenta_id === c.id);
    const valor_mercado_posiciones = invs.reduce(
      (acc, i) =>
        acc + i.cantidad * (i.precio_actual ?? i.precio_compra),
      0
    );
    const saldo_cuenta = Number(c.saldo_disponible ?? c.saldo_inicial);
    return {
      cuenta_id: c.id,
      cuenta_nombre: c.nombre,
      moneda: c.moneda,
      saldo_cuenta,
      valor_mercado_posiciones,
      no_invertido: saldo_cuenta - valor_mercado_posiciones,
      inversiones: invs,
    };
  });

  return { brokers, sinBroker };
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

// ── Onboarding: conteos livianos ─────────────────────────────────────────────

export interface OnboardingStatus {
  cuentaCount: number;
  transaccionCount: number;
}

export async function getOnboardingStatus(
  userId: string
): Promise<OnboardingStatus> {
  const supabase = await createClient();
  const [cuentasRes, txRes] = await Promise.all([
    supabase
      .from("cuentas")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", userId),
    supabase
      .from("transacciones")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", userId),
  ]);
  return {
    cuentaCount: cuentasRes.count ?? 0,
    transaccionCount: txRes.count ?? 0,
  };
}

// ── Resumen anual (totales y por categoría) ───────────────────────────────────

export interface CategoriaMontoPorMoneda {
  nombre: string;
  ARS: number;
  USD: number;
}

export interface ResumenAnualData {
  year: number;
  totales: {
    ingresos: { ARS: number; USD: number };
    egresos: { ARS: number; USD: number };
    transferenciasCount: number;
  };
  egresosPorCategoria: CategoriaMontoPorMoneda[];
  ingresosPorCategoria: CategoriaMontoPorMoneda[];
}

function sortCategoriasPorMonto(
  list: CategoriaMontoPorMoneda[]
): CategoriaMontoPorMoneda[] {
  return [...list].sort((a, b) => {
    if (b.ARS !== a.ARS) return b.ARS - a.ARS;
    return b.USD - a.USD;
  });
}

export async function getResumenAnual(
  userId: string,
  year: number
): Promise<ResumenAnualData> {
  const supabase = await createClient();
  const desde = `${year}-01-01`;
  const hasta = `${year}-12-31`;

  const { data } = await supabase
    .from("transacciones")
    .select("monto, tipo, moneda, categorias(nombre)")
    .eq("usuario_id", userId)
    .gte("fecha", desde)
    .lte("fecha", hasta);

  const rows = (data ?? []) as {
    monto: number | string;
    tipo: string;
    moneda: string;
    categorias: { nombre: string } | null;
  }[];

  const totales = {
    ingresos: { ARS: 0 as number, USD: 0 as number },
    egresos: { ARS: 0 as number, USD: 0 as number },
    transferenciasCount: 0,
  };

  const catIngresos = new Map<string, { ARS: number; USD: number }>();
  const catEgresos = new Map<string, { ARS: number; USD: number }>();

  for (const r of rows) {
    const monto = Number(r.monto);
    const moneda = r.moneda === "USD" ? "USD" : "ARS";
    if (r.tipo === "transferencia") {
      totales.transferenciasCount += 1;
      continue;
    }
    const catNombre =
      r.categorias?.nombre?.trim() || "Sin categoría";

    if (r.tipo === "ingreso") {
      totales.ingresos[moneda] += monto;
      const cur = catIngresos.get(catNombre) ?? { ARS: 0, USD: 0 };
      cur[moneda] += monto;
      catIngresos.set(catNombre, cur);
    } else if (r.tipo === "egreso") {
      totales.egresos[moneda] += monto;
      const cur = catEgresos.get(catNombre) ?? { ARS: 0, USD: 0 };
      cur[moneda] += monto;
      catEgresos.set(catNombre, cur);
    }
  }

  const ingresosPorCategoria = sortCategoriasPorMonto(
    [...catIngresos.entries()].map(([nombre, v]) => ({ nombre, ...v }))
  );
  const egresosPorCategoria = sortCategoriasPorMonto(
    [...catEgresos.entries()].map(([nombre, v]) => ({ nombre, ...v }))
  );

  return {
    year,
    totales,
    egresosPorCategoria,
    ingresosPorCategoria,
  };
}

// ── Gastos en cuotas (ARS) ───────────────────────────────────────────────────

export interface GastoCuotaListItem {
  id: string;
  descripcion: string;
  monto_cuota: number;
  cantidad_cuotas: number;
  cuotas_pagadas: number;
  fecha_primera_cuota: string;
  activo: boolean;
  cuenta_id: string;
  cuenta_nombre: string;
  categoria_id: string | null;
  categoria_nombre: string | null;
  proxima_fecha: string | null;
  monto_restante: number;
  completado: boolean;
}

export async function getGastosCuotas(
  userId: string
): Promise<GastoCuotaListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gastos_cuotas")
    .select(
      "id, descripcion, monto_cuota, cantidad_cuotas, cuotas_pagadas, fecha_primera_cuota, activo, cuenta_id, categoria_id, cuentas(nombre), categorias(nombre)"
    )
    .eq("usuario_id", userId)
    .order("activo", { ascending: false })
    .order("fecha_primera_cuota", { ascending: true });

  if (error || !data) return [];

  return (data as any[]).map((row) => {
    const monto_cuota = Number(row.monto_cuota);
    const cantidad = Number(row.cantidad_cuotas);
    const pagadas = Number(row.cuotas_pagadas);
    const completado = pagadas >= cantidad || !row.activo;
    const proxima_fecha = completado
      ? null
      : fechaProximaCuota(row.fecha_primera_cuota, pagadas, cantidad);
    const monto_restante = Math.max(0, cantidad - pagadas) * monto_cuota;
    return {
      id: row.id,
      descripcion: row.descripcion,
      monto_cuota,
      cantidad_cuotas: cantidad,
      cuotas_pagadas: pagadas,
      fecha_primera_cuota: row.fecha_primera_cuota,
      activo: row.activo,
      cuenta_id: row.cuenta_id,
      cuenta_nombre: row.cuentas?.nombre ?? "—",
      categoria_id: row.categoria_id ?? null,
      categoria_nombre: row.categorias?.nombre ?? null,
      proxima_fecha,
      monto_restante,
      completado,
    };
  });
}
