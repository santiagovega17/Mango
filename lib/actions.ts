"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CuentaResumen } from "@/lib/data";

type ActionResult =
  | { error: string; success?: never }
  | { success: true; error?: never };

// ── Validación de campos requeridos ──────────────────────────────────────────

function required(value: FormDataEntryValue | null, label: string): string {
  const str = (value as string)?.trim();
  if (!str) throw new Error(`El campo "${label}" es obligatorio.`);
  return str;
}

// ── Obtener usuario autenticado ───────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("No autenticado.");
  return { supabase, user };
}

// ── CREAR CUENTA ──────────────────────────────────────────────────────────────

export async function crearCuenta(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const nombre = required(formData.get("nombre"), "Nombre");
    const tipo = required(formData.get("tipo"), "Tipo");
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";
    const saldoRaw = (formData.get("saldo_inicial") as string)?.trim() || "0";
    const saldo_inicial = parseFloat(saldoRaw);

    if (isNaN(saldo_inicial) || saldo_inicial < 0) {
      return { error: "El saldo inicial debe ser un número positivo." };
    }

    if (!["ARS", "USD"].includes(moneda)) {
      return { error: "La moneda debe ser ARS o USD." };
    }

    const { error } = await supabase.from("cuentas").insert({
      usuario_id: user.id,
      nombre,
      tipo,
      moneda,
      saldo_inicial,
    });

    if (error) {
      console.error("Supabase crearCuenta:", error);
      return { error: "No se pudo crear la cuenta. Intentá de nuevo." };
    }

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── CREAR TRANSACCIÓN ─────────────────────────────────────────────────────────

export async function crearTransaccion(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const tipoRaw = required(formData.get("tipo"), "Tipo");
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";
    const montoRaw = required(formData.get("monto"), "Monto");
    const descripcion = (formData.get("descripcion") as string)?.trim() || null;
    const fechaRaw = (formData.get("fecha") as string)?.trim();
    const categoria_id =
      (formData.get("categoria_id") as string)?.trim() || null;

    const monto = parseFloat(montoRaw);
    if (isNaN(monto) || monto <= 0) {
      return { error: "El monto debe ser un número mayor a 0." };
    }

    if (!["ingreso", "egreso", "transferencia"].includes(tipoRaw)) {
      return { error: "Tipo de transacción inválido." };
    }

    if (!["ARS", "USD"].includes(moneda)) {
      return { error: "La moneda debe ser ARS o USD." };
    }

    const fecha =
      fechaRaw || new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("transacciones").insert({
      usuario_id: user.id,
      cuenta_id,
      tipo: tipoRaw as "ingreso" | "egreso" | "transferencia",
      moneda,
      monto,
      descripcion,
      fecha,
      categoria_id: categoria_id || null,
    });

    if (error) {
      console.error("Supabase crearTransaccion:", error);
      return { error: "No se pudo registrar la transacción. Intentá de nuevo." };
    }

    revalidatePath("/");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── OBTENER CUENTAS (para selects en Client Components) ──────────────────────
// Esta acción puede ser llamada desde componentes cliente cuando necesiten
// cargar las cuentas de forma lazy (por ejemplo, al abrir un dialog).

export async function obtenerCuentasAction(): Promise<CuentaResumen[]> {
  try {
    const { supabase, user } = await getAuthUser();

    const { data, error } = await supabase
      .from("cuentas")
      .select("id, nombre, tipo, moneda, saldo_inicial")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: true });

    if (error) return [];
    return (data ?? []) as CuentaResumen[];
  } catch {
    return [];
  }
}
