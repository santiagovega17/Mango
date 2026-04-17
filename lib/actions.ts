"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CuentaResumen } from "@/lib/data";
import { parseFormDecimal } from "@/lib/form-numbers";

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
    const saldo_inicial = parseFormDecimal(saldoRaw);

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

    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── ELIMINAR CUENTA ───────────────────────────────────────────────────────────

export async function eliminarCuenta(cuentaId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    // Verificamos que la cuenta pertenezca al usuario antes de eliminar
    const { error } = await supabase
      .from("cuentas")
      .delete()
      .eq("id", cuentaId)
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Supabase eliminarCuenta:", error);
      return { error: "No se pudo eliminar la cuenta. Intentá de nuevo." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── ACTUALIZAR PERFIL ─────────────────────────────────────────────────────────

export async function actualizarPerfil(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const nombre = required(formData.get("nombre"), "Nombre");
    const moneda_principal = (formData.get("moneda_principal") as string) || "ARS";

    if (!["ARS", "USD"].includes(moneda_principal)) {
      return { error: "Moneda inválida." };
    }

    const { error } = await supabase
      .from("usuarios")
      .update({ nombre, moneda_principal })
      .eq("id", user.id);

    if (error) {
      console.error("Supabase actualizarPerfil:", error);
      return { error: "No se pudo actualizar el perfil. Intentá de nuevo." };
    }

    revalidatePath("/configuracion");
    revalidatePath("/dashboard");
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

    const monto = parseFormDecimal(montoRaw);
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

    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── CREAR INVERSIÓN ───────────────────────────────────────────────────────────

export async function crearInversion(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const nombre_activo = required(formData.get("nombre_activo"), "Nombre del activo");
    const tipo_activo = required(formData.get("tipo_activo"), "Tipo de activo");
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";
    const cantidadRaw = required(formData.get("cantidad"), "Cantidad");
    const precioCompraRaw = required(formData.get("precio_compra"), "Precio de compra");
    const precioActualRaw = (formData.get("precio_actual") as string)?.trim() || "";

    const cantidad = parseFormDecimal(cantidadRaw);
    if (isNaN(cantidad) || cantidad <= 0)
      return { error: "La cantidad debe ser un número mayor a 0." };

    const precio_compra = parseFormDecimal(precioCompraRaw);
    if (isNaN(precio_compra) || precio_compra < 0)
      return { error: "El precio de compra debe ser un número positivo." };

    const precio_actual =
      precioActualRaw !== "" ? parseFormDecimal(precioActualRaw) : null;
    if (precio_actual !== null && (isNaN(precio_actual) || precio_actual < 0))
      return { error: "El precio actual debe ser un número positivo." };

    if (!["ARS", "USD"].includes(moneda))
      return { error: "La moneda debe ser ARS o USD." };

    const { error: insertError } = await supabase.from("inversiones").insert({
      usuario_id: user.id,
      nombre_activo,
      tipo_activo,
      moneda,
      cantidad,
      precio_compra,
      precio_actual, // null si no se proporcionó — columna ya existe en la DB
    });

    if (insertError) {
      const detalle = [insertError.code, insertError.message, insertError.details]
        .filter(Boolean)
        .join(" — ");
      console.error("❌ Supabase crearInversion:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        payload: { usuario_id: user.id, nombre_activo, tipo_activo },
      });
      return { error: `Error al guardar: ${detalle}` };
    }

    revalidatePath("/inversiones");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── ELIMINAR INVERSIÓN ────────────────────────────────────────────────────────

export async function eliminarInversion(
  inversionId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const { error } = await supabase
      .from("inversiones")
      .delete()
      .eq("id", inversionId)
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Supabase eliminarInversion:", error);
      return { error: "No se pudo eliminar la inversión. Intentá de nuevo." };
    }

    revalidatePath("/inversiones");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── ACTUALIZAR PRECIO ACTUAL ──────────────────────────────────────────────────

export async function actualizarPrecioActual(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const inversionId = required(formData.get("inversion_id"), "ID de inversión");
    const precioRaw = (formData.get("precio_actual") as string)?.trim();
    const precio_actual =
      precioRaw !== "" && precioRaw != null ? parseFormDecimal(precioRaw) : null;

    if (precio_actual !== null && (isNaN(precio_actual) || precio_actual < 0))
      return { error: "El precio debe ser un número positivo." };

    const { error } = await supabase
      .from("inversiones")
      .update({ precio_actual })
      .eq("id", inversionId)
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Supabase actualizarPrecioActual:", error);
      return { error: "No se pudo actualizar el precio. Intentá de nuevo." };
    }

    revalidatePath("/inversiones");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── EDITAR TRANSACCIÓN ────────────────────────────────────────────────────────

export async function editarTransaccion(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const transaccionId = required(formData.get("transaccion_id"), "ID");
    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const tipoRaw = required(formData.get("tipo"), "Tipo");
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";
    const montoRaw = required(formData.get("monto"), "Monto");
    const descripcion =
      (formData.get("descripcion") as string)?.trim() || null;
    const fechaRaw = (formData.get("fecha") as string)?.trim();
    const categoria_id =
      (formData.get("categoria_id") as string)?.trim() || null;

    const monto = parseFormDecimal(montoRaw);
    if (isNaN(monto) || monto <= 0)
      return { error: "El monto debe ser mayor a 0." };

    if (!["ingreso", "egreso", "transferencia"].includes(tipoRaw))
      return { error: "Tipo inválido." };

    if (!["ARS", "USD"].includes(moneda))
      return { error: "Moneda inválida." };

    const fecha = fechaRaw || new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("transacciones")
      .update({
        cuenta_id,
        tipo: tipoRaw as "ingreso" | "egreso" | "transferencia",
        moneda,
        monto,
        descripcion,
        fecha,
        categoria_id: categoria_id || null,
      })
      .eq("id", transaccionId)
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Supabase editarTransaccion:", error);
      return { error: "No se pudo editar la transacción." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── ELIMINAR TRANSACCIÓN ──────────────────────────────────────────────────────

export async function eliminarTransaccion(
  transaccionId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const { error } = await supabase
      .from("transacciones")
      .delete()
      .eq("id", transaccionId)
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Supabase eliminarTransaccion:", error);
      return { error: "No se pudo eliminar la transacción." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── CREAR TRANSFERENCIA ───────────────────────────────────────────────────────
// Soporta transferencias en la misma moneda y conversiones entre ARS↔USD.
// Genera siempre dos registros: un egreso en origen y un ingreso en destino,
// cada uno con su propia moneda y monto.

export async function crearTransferencia(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const cuentaOrigenId = required(formData.get("cuenta_origen_id"), "Cuenta origen");
    const cuentaDestinoId = required(formData.get("cuenta_destino_id"), "Cuenta destino");
    const monedaOrigen = required(formData.get("moneda_origen"), "Moneda origen") as "ARS" | "USD";
    const monedaDestino = required(formData.get("moneda_destino"), "Moneda destino") as "ARS" | "USD";
    const montoOrigenRaw = required(formData.get("monto_origen"), "Monto origen");
    const montoDestinoRaw = required(formData.get("monto_destino"), "Monto destino");
    const descripcion = (formData.get("descripcion") as string)?.trim() || "Transferencia";
    const fechaRaw = (formData.get("fecha") as string)?.trim();

    if (cuentaOrigenId === cuentaDestinoId)
      return { error: "La cuenta origen y destino no pueden ser la misma." };

    const montoOrigen = parseFormDecimal(montoOrigenRaw);
    if (isNaN(montoOrigen) || montoOrigen <= 0)
      return { error: "El monto a retirar debe ser mayor a 0." };

    const montoDestino = parseFormDecimal(montoDestinoRaw);
    if (isNaN(montoDestino) || montoDestino <= 0)
      return { error: "El monto a depositar debe ser mayor a 0." };

    if (!["ARS", "USD"].includes(monedaOrigen) || !["ARS", "USD"].includes(monedaDestino))
      return { error: "Moneda inválida." };

    const fecha = fechaRaw || new Date().toISOString().split("T")[0];
    const esMultimoneda = monedaOrigen !== monedaDestino;
    const descripcionFinal = esMultimoneda
      ? descripcion || (monedaOrigen === "ARS" ? "Compra de USD" : "Venta de USD")
      : descripcion;

    const { error } = await supabase.from("transacciones").insert([
      {
        usuario_id: user.id,
        cuenta_id: cuentaOrigenId,
        tipo: "egreso" as const,
        moneda: monedaOrigen,
        monto: montoOrigen,
        descripcion: descripcionFinal,
        fecha,
        categoria_id: null,
      },
      {
        usuario_id: user.id,
        cuenta_id: cuentaDestinoId,
        tipo: "ingreso" as const,
        moneda: monedaDestino,
        monto: montoDestino,
        descripcion: descripcionFinal,
        fecha,
        categoria_id: null,
      },
    ]);

    if (error) {
      console.error("Supabase crearTransferencia:", error);
      return { error: "No se pudo registrar la transferencia." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── OBTENER CUENTAS (para selects en Client Components) ──────────────────────
// Esta acción puede ser llamada desde componentes cliente cuando necesiten
// cargar las cuentas de forma lazy (por ejemplo, al abrir un dialog).

// ── OBTENER CATEGORÍAS (para selects en Client Components) ───────────────────

export async function obtenerCategoriasAction(): Promise<
  { id: string; nombre: string; color: string | null }[]
> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categorias")
      .select("id, nombre, color")
      .order("nombre", { ascending: true });
    return (data ?? []) as { id: string; nombre: string; color: string | null }[];
  } catch {
    return [];
  }
}

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
