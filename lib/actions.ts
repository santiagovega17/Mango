"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CuentaResumen } from "@/lib/data";
import { esCuentaBrokerInversion } from "@/lib/cuenta-tipo";
import { parseFormDecimal } from "@/lib/form-numbers";
import { fechaProximaCuota } from "@/lib/cuotas-utils";

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

    const inversionExistenteId =
      (formData.get("inversion_id") as string)?.trim() || null;
    const nombre_activo = required(formData.get("nombre_activo"), "Nombre del activo");
    const tipo_activo = required(formData.get("tipo_activo"), "Tipo de activo");
    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta broker");
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";
    const cantidadRaw = required(formData.get("cantidad"), "Cantidad");
    const precioCompraRaw = required(formData.get("precio_compra"), "Precio de compra");
    const precioActualRaw = (formData.get("precio_actual") as string)?.trim() || "";
    const fechaOperacionRaw = (formData.get("fecha_operacion") as string)?.trim();
    const tasaRaw = (formData.get("tasa_anual") as string)?.trim() || "";
    const fechaVencRaw = (formData.get("fecha_vencimiento") as string)?.trim() || "";

    const cantidad = tipo_activo === "Plazo Fijo" ? 1 : parseFormDecimal(cantidadRaw);
    if (isNaN(cantidad) || cantidad <= 0)
      return { error: "La cantidad debe ser un número mayor a 0." };

    const precio_compra = parseFormDecimal(precioCompraRaw);
    if (isNaN(precio_compra) || precio_compra < 0)
      return { error: "El precio de compra debe ser un número positivo." };

    const precio_actual =
      precioActualRaw !== "" ? parseFormDecimal(precioActualRaw) : null;
    if (precio_actual !== null && (isNaN(precio_actual) || precio_actual < 0))
      return { error: "El precio actual debe ser un número positivo." };

    const fecha_operacion =
      fechaOperacionRaw && /^\d{4}-\d{2}-\d{2}$/.test(fechaOperacionRaw)
        ? fechaOperacionRaw
        : new Date().toISOString().split("T")[0];

    const esPlazoFijo = tipo_activo === "Plazo Fijo";
    const tasa_anual = tasaRaw !== "" ? parseFormDecimal(tasaRaw) : null;
    if (esPlazoFijo && (tasa_anual == null || isNaN(tasa_anual) || tasa_anual < 0)) {
      return { error: "Para plazo fijo ingresá una tasa anual válida." };
    }
    if (!esPlazoFijo && tasaRaw !== "") {
      return { error: "La tasa anual solo aplica a activos de tipo Plazo Fijo." };
    }
    const fecha_vencimiento =
      fechaVencRaw && /^\d{4}-\d{2}-\d{2}$/.test(fechaVencRaw) ? fechaVencRaw : null;
    if (esPlazoFijo && !fecha_vencimiento) {
      return { error: "Para plazo fijo ingresá la fecha de vencimiento." };
    }
    if (!esPlazoFijo && fechaVencRaw !== "") {
      return {
        error:
          "La fecha de vencimiento solo aplica a activos de tipo Plazo Fijo.",
      };
    }

    if (!["ARS", "USD"].includes(moneda))
      return { error: "La moneda debe ser ARS o USD." };

    const { data: cuenta, error: cuentaErr } = await supabase
      .from("cuentas")
      .select("id, moneda, tipo")
      .eq("id", cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (cuentaErr || !cuenta)
      return { error: "La cuenta broker no existe o no te pertenece." };
    if (!esCuentaBrokerInversion(cuenta.tipo)) {
      return {
        error:
          "Elegí una cuenta tipo «Cuenta de inversión» (broker). Podés crearla en Configuración.",
      };
    }
    if (cuenta.moneda !== moneda) {
      return {
        error:
          "La moneda del activo debe ser la misma que la de la cuenta broker.",
      };
    }

    let inversionId: string | null = null;
    let insertError: {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    } | null = null;

    if (inversionExistenteId) {
      const { data: existente, error: exErr } = await supabase
        .from("inversiones")
        .select(
          "id, nombre_activo, tipo_activo, cuenta_id, moneda, cantidad, precio_compra, precio_actual, vendida_at"
        )
        .eq("id", inversionExistenteId)
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (exErr || !existente)
        return { error: "La inversión seleccionada no existe o no te pertenece." };
      if (existente.vendida_at) {
        return { error: "No podés agregar compra a un activo vendido." };
      }
      if (tipo_activo === "Plazo Fijo") {
        return {
          error:
            "Para plazo fijo registrá una nueva inversión en lugar de sumar a una existente.",
        };
      }
      if (existente.cuenta_id !== cuenta_id || existente.moneda !== moneda)
        return {
          error:
            "La inversión seleccionada debe pertenecer a la misma cuenta broker y moneda.",
        };

      const cantidadActual = Number(existente.cantidad);
      const precioCompraActual = Number(existente.precio_compra);
      const totalAnterior = cantidadActual * precioCompraActual;
      const totalNuevo = cantidad * precio_compra;
      const cantidadFinal = cantidadActual + cantidad;
      const precioPromedio =
        cantidadFinal > 0 ? (totalAnterior + totalNuevo) / cantidadFinal : precio_compra;

      const payload: {
        cantidad: number;
        precio_compra: number;
        precio_actual?: number | null;
        tasa_anual?: number | null;
        fecha_vencimiento?: string | null;
      } = {
        cantidad: cantidadFinal,
        precio_compra: precioPromedio,
      };
      if (precio_actual !== null) payload.precio_actual = precio_actual;
      if (esPlazoFijo) {
        payload.tasa_anual = tasa_anual;
        payload.fecha_vencimiento = fecha_vencimiento;
      }

      const { data: updated, error: updErr } = await supabase
        .from("inversiones")
        .update(payload)
        .eq("id", inversionExistenteId)
        .eq("usuario_id", user.id)
        .select("id")
        .maybeSingle();

      if (updErr || !updated) {
        insertError = updErr ?? {
          code: "UPDATE_FAILED",
          message: "No se pudo actualizar la inversión existente.",
        };
      } else {
        inversionId = updated.id;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("inversiones")
        .insert({
          usuario_id: user.id,
          cuenta_id,
          nombre_activo,
          tipo_activo,
          moneda,
          cantidad,
          precio_compra,
          precio_actual: esPlazoFijo ? null : precio_actual,
          tasa_anual: esPlazoFijo ? tasa_anual : null,
          fecha_vencimiento: esPlazoFijo ? fecha_vencimiento : null,
          vendida_at: null,
          fecha_venta: null,
          precio_venta: null,
        })
        .select("id")
        .maybeSingle();
      if (error || !inserted) {
        insertError = error ?? {
          code: "INSERT_FAILED",
          message: "No se pudo crear la inversión.",
        };
      } else {
        inversionId = inserted.id;
      }
    }

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

    if (!inversionId) return { error: "No se pudo guardar la inversión." };

    const monto_total = Math.round(cantidad * precio_compra * 100) / 100;
    const { error: movErr } = await supabase
      .from("inversiones_movimientos")
      .insert({
        usuario_id: user.id,
        inversion_id: inversionId,
        fecha: fecha_operacion,
        cantidad,
        precio_unitario: precio_compra,
        monto_total,
      });
    if (movErr) {
      console.error("Supabase inversiones_movimientos:", movErr);
      return {
        error:
          "La inversión se guardó, pero falló el historial de movimientos. Revisá la migración SQL.",
      };
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

    const { data: inv, error: invErr } = await supabase
      .from("inversiones")
      .select("id, vendida_at")
      .eq("id", inversionId)
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (invErr || !inv) return { error: "La inversión no existe." };
    if (inv.vendida_at) return { error: "No se puede editar un activo vendido." };

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

export async function venderInversion(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();
    const inversionId = required(formData.get("inversion_id"), "Inversión");
    const precioVentaRaw = required(formData.get("precio_venta"), "Precio de venta");
    const fechaRaw = (formData.get("fecha_venta") as string)?.trim();

    const precio_venta = parseFormDecimal(precioVentaRaw);
    if (!Number.isFinite(precio_venta) || precio_venta <= 0) {
      return { error: "Ingresá un precio de venta mayor a 0." };
    }
    const fecha_venta =
      fechaRaw && /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
        ? fechaRaw
        : new Date().toISOString().split("T")[0];

    const { data: inv, error: invErr } = await supabase
      .from("inversiones")
      .select(
        "id, nombre_activo, cantidad, moneda, cuenta_id, vendida_at"
      )
      .eq("id", inversionId)
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (invErr || !inv) return { error: "La inversión no existe o no te pertenece." };
    if (inv.vendida_at) return { error: "Esta inversión ya fue vendida." };
    if (!inv.cuenta_id) {
      return { error: "La inversión no tiene cuenta broker asignada." };
    }

    const montoTotal = Number(inv.cantidad) * precio_venta;
    if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
      return { error: "No se pudo calcular el monto de la venta." };
    }

    const descripcion = `Venta de ${inv.nombre_activo}`;
    const { data: tx, error: txErr } = await supabase
      .from("transacciones")
      .insert({
        usuario_id: user.id,
        cuenta_id: inv.cuenta_id,
        tipo: "ingreso",
        moneda: inv.moneda as "ARS" | "USD",
        monto: Math.round(montoTotal * 100) / 100,
        descripcion,
        fecha: fecha_venta,
        categoria_id: null,
      })
      .select("id")
      .maybeSingle();
    if (txErr || !tx) {
      return { error: "No se pudo registrar el ingreso de la venta." };
    }

    const { error: upErr } = await supabase
      .from("inversiones")
      .update({
        precio_venta,
        fecha_venta,
        vendida_at: new Date().toISOString(),
      })
      .eq("id", inversionId)
      .eq("usuario_id", user.id)
      .is("vendida_at", null);
    if (upErr) {
      console.error("Supabase venderInversion:", upErr);
      return {
        error:
          "Se creó el ingreso, pero no se pudo cerrar la inversión. Revisá el estado manualmente.",
      };
    }

    revalidatePath("/inversiones");
    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
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

// ── GASTOS EN CUOTAS (ARS) ───────────────────────────────────────────────────

const MAX_CUOTAS_PLAN = 600;

export async function crearGastoCuota(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const descripcion = required(formData.get("descripcion"), "Descripción");
    const montoTotalRaw = required(formData.get("monto_total"), "Monto total");
    const cantidadRaw = required(
      formData.get("cantidad_cuotas"),
      "Cantidad de cuotas"
    );
    const fecha_primera = required(
      formData.get("fecha_primera_cuota"),
      "Primera cuota"
    );
    const categoria_id =
      (formData.get("categoria_id") as string)?.trim() || null;

    const monto_total = parseFormDecimal(montoTotalRaw);
    if (isNaN(monto_total) || monto_total <= 0)
      return { error: "El monto total debe ser mayor a 0." };

    const cantidad_cuotas = parseInt(cantidadRaw, 10);
    if (
      !Number.isFinite(cantidad_cuotas) ||
      cantidad_cuotas < 1 ||
      cantidad_cuotas > MAX_CUOTAS_PLAN
    ) {
      return {
        error: `La cantidad de cuotas debe ser entre 1 y ${MAX_CUOTAS_PLAN}.`,
      };
    }

    const monto_cuota =
      Math.round((monto_total / cantidad_cuotas) * 100) / 100;
    if (!Number.isFinite(monto_cuota) || monto_cuota <= 0)
      return { error: "El monto por cuota calculado no es válido." };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_primera))
      return { error: "La fecha de la primera cuota no es válida." };

    const { data: cuenta, error: cuentaErr } = await supabase
      .from("cuentas")
      .select("id, moneda")
      .eq("id", cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (cuentaErr || !cuenta)
      return { error: "La cuenta no existe o no te pertenece." };
    if (cuenta.moneda !== "ARS")
      return { error: "Los planes en cuotas solo admiten cuentas en pesos (ARS)." };

    const { error } = await supabase.from("gastos_cuotas").insert({
      usuario_id: user.id,
      cuenta_id,
      categoria_id: categoria_id || null,
      descripcion,
      monto_cuota,
      cantidad_cuotas,
      cuotas_pagadas: 0,
      fecha_primera_cuota: fecha_primera,
      activo: true,
    });

    if (error) {
      console.error("Supabase crearGastoCuota:", error);
      return { error: "No se pudo crear el plan. Intentá de nuevo." };
    }

    revalidatePath("/cuotas");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function editarGastoCuota(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const gasto_cuota_id = required(formData.get("gasto_cuota_id"), "Plan");
    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const descripcion = required(formData.get("descripcion"), "Descripción");
    const montoTotalRaw = required(formData.get("monto_total"), "Monto total");
    const cantidadRaw = required(
      formData.get("cantidad_cuotas"),
      "Cantidad de cuotas"
    );
    const fecha_primera = required(
      formData.get("fecha_primera_cuota"),
      "Primera cuota"
    );
    const categoria_id =
      (formData.get("categoria_id") as string)?.trim() || null;

    const { data: existente, error: exErr } = await supabase
      .from("gastos_cuotas")
      .select("cuotas_pagadas")
      .eq("id", gasto_cuota_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (exErr || !existente)
      return { error: "El plan no existe o no te pertenece." };

    const pagadas = Number(existente.cuotas_pagadas);

    const monto_total = parseFormDecimal(montoTotalRaw);
    if (isNaN(monto_total) || monto_total <= 0)
      return { error: "El monto total debe ser mayor a 0." };

    const cantidad_cuotas = parseInt(cantidadRaw, 10);
    if (
      !Number.isFinite(cantidad_cuotas) ||
      cantidad_cuotas < 1 ||
      cantidad_cuotas > MAX_CUOTAS_PLAN
    ) {
      return {
        error: `La cantidad de cuotas debe ser entre 1 y ${MAX_CUOTAS_PLAN}.`,
      };
    }

    if (cantidad_cuotas < pagadas) {
      return {
        error: "La cantidad de cuotas no puede ser menor a las cuotas ya pagadas.",
      };
    }

    const monto_cuota =
      Math.round((monto_total / cantidad_cuotas) * 100) / 100;
    if (!Number.isFinite(monto_cuota) || monto_cuota <= 0)
      return { error: "El monto por cuota calculado no es válido." };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_primera))
      return { error: "La fecha de la primera cuota no es válida." };

    const { data: cuenta, error: cuentaErr } = await supabase
      .from("cuentas")
      .select("id, moneda")
      .eq("id", cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (cuentaErr || !cuenta)
      return { error: "La cuenta no existe o no te pertenece." };
    if (cuenta.moneda !== "ARS")
      return { error: "Los planes en cuotas solo admiten cuentas en pesos (ARS)." };

    const terminado = pagadas >= cantidad_cuotas;

    const { error } = await supabase
      .from("gastos_cuotas")
      .update({
        cuenta_id,
        categoria_id: categoria_id || null,
        descripcion,
        monto_cuota,
        cantidad_cuotas,
        fecha_primera_cuota: fecha_primera,
        activo: !terminado,
      })
      .eq("id", gasto_cuota_id)
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Supabase editarGastoCuota:", error);
      return { error: "No se pudo actualizar el plan. Intentá de nuevo." };
    }

    revalidatePath("/cuotas");
    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function pagarCuotaGasto(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const gasto_cuota_id = required(formData.get("gasto_cuota_id"), "Plan");
    const fechaRaw = (formData.get("fecha") as string)?.trim() || "";

    const { data: plan, error: planErr } = await supabase
      .from("gastos_cuotas")
      .select(
        "id, cuenta_id, categoria_id, descripcion, monto_cuota, cantidad_cuotas, cuotas_pagadas, activo, fecha_primera_cuota"
      )
      .eq("id", gasto_cuota_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (planErr || !plan)
      return { error: "El plan no existe o no te pertenece." };
    if (!plan.activo || plan.cuotas_pagadas >= plan.cantidad_cuotas) {
      return { error: "Este plan no tiene cuotas pendientes." };
    }

    const { data: cuenta, error: cuentaErr } = await supabase
      .from("cuentas")
      .select("moneda")
      .eq("id", plan.cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (cuentaErr || !cuenta || cuenta.moneda !== "ARS") {
      return { error: "La cuenta del plan debe ser en ARS." };
    }

    const monto = Number(plan.monto_cuota);
    if (!Number.isFinite(monto) || monto <= 0)
      return { error: "Monto de cuota inválido en el plan." };

    const pagadas = plan.cuotas_pagadas;
    const cantidad = plan.cantidad_cuotas;
    const proxima = fechaProximaCuota(
      plan.fecha_primera_cuota,
      pagadas,
      cantidad
    );
    if (!proxima)
      return { error: "Este plan no tiene cuotas pendientes." };

    let fecha = fechaRaw;
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      return { error: "La fecha no es válida." };
    if (!fecha) fecha = proxima;

    const nuevaPagada = pagadas + 1;
    const descripcionTx = `${plan.descripcion} — Cuota ${nuevaPagada}/${cantidad}`;

    const { data: inserted, error: insErr } = await supabase
      .from("transacciones")
      .insert({
        usuario_id: user.id,
        cuenta_id: plan.cuenta_id,
        tipo: "egreso" as const,
        moneda: "ARS" as const,
        monto,
        descripcion: descripcionTx,
        fecha,
        categoria_id: plan.categoria_id,
        gasto_cuota_id,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !inserted?.id) {
      console.error("Supabase pagarCuotaGasto insert:", insErr);
      return { error: "No se pudo registrar el egreso. Intentá de nuevo." };
    }

    const terminado = nuevaPagada >= cantidad;
    const { data: updated, error: updErr } = await supabase
      .from("gastos_cuotas")
      .update({
        cuotas_pagadas: nuevaPagada,
        activo: !terminado,
      })
      .eq("id", gasto_cuota_id)
      .eq("usuario_id", user.id)
      .eq("cuotas_pagadas", pagadas)
      .select("id")
      .maybeSingle();

    if (updErr || !updated) {
      await supabase
        .from("transacciones")
        .delete()
        .eq("id", inserted.id)
        .eq("usuario_id", user.id);
      return {
        error:
          "No se pudo confirmar el pago (otro proceso modificó el plan). Reintentá.",
      };
    }

    revalidatePath("/cuotas");
    revalidatePath("/transacciones");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function eliminarGastoCuota(
  gastoCuotaId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const { data, error } = await supabase
      .from("gastos_cuotas")
      .delete()
      .eq("id", gastoCuotaId)
      .eq("usuario_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase eliminarGastoCuota:", error);
      return { error: "No se pudo eliminar el plan." };
    }

    if (!data)
      return { error: "El plan no existe o no te pertenece." };

    revalidatePath("/cuotas");
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

export async function obtenerActivosInversionAction(): Promise<
  {
    id: string;
    nombre_activo: string;
    tipo_activo: string;
    cuenta_id: string | null;
    moneda: "ARS" | "USD";
  }[]
> {
  try {
    const { supabase, user } = await getAuthUser();
    const { data, error } = await supabase
      .from("inversiones")
      .select("id, nombre_activo, tipo_activo, cuenta_id, moneda")
      .eq("usuario_id", user.id)
      .is("vendida_at", null)
      .order("nombre_activo", { ascending: true });
    if (error) return [];
    return (data ?? []) as {
      id: string;
      nombre_activo: string;
      tipo_activo: string;
      cuenta_id: string | null;
      moneda: "ARS" | "USD";
    }[];
  } catch {
    return [];
  }
}

// ── INGRESOS FUTUROS (por cobrar) ─────────────────────────────────────────────

export async function crearIngresoFuturo(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";
    const montoRaw = required(formData.get("monto"), "Monto");
    const monto = parseFormDecimal(montoRaw);
    const descripcion = (formData.get("descripcion") as string)?.trim() || null;
    const fechaEsperadaRaw = (formData.get("fecha_esperada") as string)?.trim();
    const fecha_esperada =
      fechaEsperadaRaw && /^\d{4}-\d{2}-\d{2}$/.test(fechaEsperadaRaw)
        ? fechaEsperadaRaw
        : null;

    if (isNaN(monto) || monto <= 0) {
      return { error: "El monto debe ser un número mayor a 0." };
    }
    if (!["ARS", "USD"].includes(moneda)) {
      return { error: "La moneda debe ser ARS o USD." };
    }

    const { data: cuenta, error: cuErr } = await supabase
      .from("cuentas")
      .select("id, moneda")
      .eq("id", cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (cuErr || !cuenta) {
      return { error: "No se encontró la cuenta." };
    }
    if (cuenta.moneda !== moneda) {
      return { error: "Elegí una cuenta en la misma moneda que el ingreso." };
    }

    const { error } = await supabase.from("ingresos_futuros").insert({
      usuario_id: user.id,
      cuenta_id,
      monto,
      moneda,
      descripcion,
      fecha_esperada,
    });

    if (error) {
      console.error("Supabase crearIngresoFuturo:", error);
      return {
        error:
          "No se pudo guardar el ingreso pendiente. ¿Ejecutaste la migración SQL en Supabase?",
      };
    }

    revalidatePath("/por-cobrar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function editarIngresoFuturo(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const id = required(formData.get("ingreso_futuro_id"), "Ingreso");
    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";
    const montoRaw = required(formData.get("monto"), "Monto");
    const monto = parseFormDecimal(montoRaw);
    const descripcion = (formData.get("descripcion") as string)?.trim() || null;
    const fechaEsperadaRaw = (formData.get("fecha_esperada") as string)?.trim();
    const fecha_esperada =
      fechaEsperadaRaw && /^\d{4}-\d{2}-\d{2}$/.test(fechaEsperadaRaw)
        ? fechaEsperadaRaw
        : null;

    if (isNaN(monto) || monto <= 0) {
      return { error: "El monto debe ser un número mayor a 0." };
    }
    if (!["ARS", "USD"].includes(moneda)) {
      return { error: "La moneda debe ser ARS o USD." };
    }

    const { data: pend, error: peErr } = await supabase
      .from("ingresos_futuros")
      .select("id, cobrado_at")
      .eq("id", id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (peErr || !pend) {
      return { error: "No se encontró el ingreso pendiente." };
    }
    if (pend.cobrado_at) {
      return { error: "No se puede editar un ingreso ya cobrado." };
    }

    const { data: cuenta, error: cuErr } = await supabase
      .from("cuentas")
      .select("id, moneda")
      .eq("id", cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (cuErr || !cuenta) {
      return { error: "No se encontró la cuenta." };
    }
    if (cuenta.moneda !== moneda) {
      return { error: "Elegí una cuenta en la misma moneda que el ingreso." };
    }

    const { data: updated, error } = await supabase
      .from("ingresos_futuros")
      .update({
        cuenta_id,
        moneda,
        monto,
        descripcion,
        fecha_esperada,
      })
      .eq("id", id)
      .eq("usuario_id", user.id)
      .is("cobrado_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase editarIngresoFuturo:", error);
      return { error: "No se pudo actualizar el ingreso pendiente." };
    }
    if (!updated) {
      return {
        error:
          "No se actualizó nada: puede que el ingreso ya se haya cobrado. Refrescá la página.",
      };
    }

    revalidatePath("/por-cobrar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function cobrarIngresoFuturo(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const ingresoId = required(formData.get("ingreso_futuro_id"), "Ingreso");
    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const fechaRaw = (formData.get("fecha") as string)?.trim();
    const montoRaw = required(formData.get("monto"), "Monto");
    const monto = parseFormDecimal(montoRaw);
    const categoria_id =
      (formData.get("categoria_id") as string)?.trim() || null;
    const descripcionForm = (formData.get("descripcion") as string)?.trim();

    if (isNaN(monto) || monto <= 0) {
      return { error: "El monto debe ser un número mayor a 0." };
    }

    const { data: row, error: fetchErr } = await supabase
      .from("ingresos_futuros")
      .select("id, moneda, cobrado_at, descripcion")
      .eq("id", ingresoId)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (fetchErr || !row) {
      return { error: "No se encontró el ingreso pendiente." };
    }
    if (row.cobrado_at) {
      return { error: "Este ingreso ya fue registrado como cobrado." };
    }

    const { data: cuenta, error: cuErr } = await supabase
      .from("cuentas")
      .select("id, moneda")
      .eq("id", cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (cuErr || !cuenta) {
      return { error: "Cuenta inválida." };
    }
    if (cuenta.moneda !== row.moneda) {
      return {
        error: "La cuenta debe ser en la misma moneda que el ingreso pendiente.",
      };
    }

    const fecha =
      fechaRaw && /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
        ? fechaRaw
        : new Date().toISOString().split("T")[0];

    const descripcionFinal =
      descripcionForm ||
      (typeof row.descripcion === "string" && row.descripcion.trim()) ||
      null;

    const { data: txRow, error: insErr } = await supabase
      .from("transacciones")
      .insert({
        usuario_id: user.id,
        cuenta_id,
        tipo: "ingreso" as const,
        moneda: row.moneda as "ARS" | "USD",
        monto,
        descripcion: descripcionFinal,
        fecha,
        categoria_id: categoria_id || null,
        ingreso_futuro_id: ingresoId,
      })
      .select("id")
      .single();

    if (insErr || !txRow) {
      console.error("Supabase cobrarIngresoFuturo insert:", insErr);
      return { error: "No se pudo registrar el ingreso en la cuenta." };
    }

    const { error: upErr } = await supabase
      .from("ingresos_futuros")
      .update({
        cobrado_at: new Date().toISOString(),
        transaccion_id: txRow.id,
      })
      .eq("id", ingresoId)
      .eq("usuario_id", user.id)
      .is("cobrado_at", null);

    if (upErr) {
      console.error("cobrarIngresoFuturo update ingreso:", upErr);
      return {
        error:
          "Se creó la transacción pero no se pudo marcar el pendiente como cobrado. Revisá con soporte o borrá la transacción duplicada si aplica.",
      };
    }

    revalidatePath("/por-cobrar");
    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function eliminarIngresoFuturo(
  ingresoFuturoId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const { data, error } = await supabase
      .from("ingresos_futuros")
      .delete()
      .eq("id", ingresoFuturoId)
      .eq("usuario_id", user.id)
      .is("cobrado_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase eliminarIngresoFuturo:", error);
      return { error: "No se pudo eliminar el registro." };
    }
    if (!data) {
      return {
        error:
          "No existe, no te pertenece o ya fue cobrado (no se puede borrar).",
      };
    }

    revalidatePath("/por-cobrar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ── GASTOS FIJOS MENSUALES ───────────────────────────────────────────────────

export async function crearGastoFijo(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();

    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const descripcion = required(formData.get("descripcion"), "Descripción");
    const montoRaw = required(formData.get("monto"), "Monto");
    const diaRaw = required(formData.get("dia_mes"), "Día del mes");
    const fecha_inicio = required(formData.get("fecha_inicio"), "Fecha de inicio");
    const categoria_id = (formData.get("categoria_id") as string)?.trim() || null;
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";

    const monto = parseFormDecimal(montoRaw);
    if (!Number.isFinite(monto) || monto <= 0)
      return { error: "El monto debe ser mayor a 0." };

    const dia_mes = parseInt(diaRaw, 10);
    if (!Number.isFinite(dia_mes) || dia_mes < 1 || dia_mes > 31)
      return { error: "El día del mes debe estar entre 1 y 31." };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio))
      return { error: "La fecha de inicio no es válida." };

    const { data: cuenta, error: cuentaErr } = await supabase
      .from("cuentas")
      .select("id, moneda")
      .eq("id", cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (cuentaErr || !cuenta)
      return { error: "La cuenta no existe o no te pertenece." };
    if (cuenta.moneda !== moneda)
      return { error: "La moneda del gasto fijo debe coincidir con la de la cuenta." };

    const { error } = await supabase.from("gastos_fijos").insert({
      usuario_id: user.id,
      cuenta_id,
      categoria_id: categoria_id || null,
      descripcion,
      monto,
      moneda,
      dia_mes,
      fecha_inicio,
      activo: true,
    });

    if (error) {
      console.error("Supabase crearGastoFijo:", error);
      return { error: "No se pudo crear el gasto fijo." };
    }

    revalidatePath("/gastos-fijos");
    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function editarGastoFijo(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();
    const gasto_fijo_id = required(formData.get("gasto_fijo_id"), "Gasto fijo");
    const cuenta_id = required(formData.get("cuenta_id"), "Cuenta");
    const descripcion = required(formData.get("descripcion"), "Descripción");
    const montoRaw = required(formData.get("monto"), "Monto");
    const diaRaw = required(formData.get("dia_mes"), "Día del mes");
    const fecha_inicio = required(formData.get("fecha_inicio"), "Fecha de inicio");
    const categoria_id = (formData.get("categoria_id") as string)?.trim() || null;
    const activoRaw = (formData.get("activo") as string)?.trim() || "1";
    const moneda = required(formData.get("moneda"), "Moneda") as "ARS" | "USD";

    const monto = parseFormDecimal(montoRaw);
    if (!Number.isFinite(monto) || monto <= 0)
      return { error: "El monto debe ser mayor a 0." };

    const dia_mes = parseInt(diaRaw, 10);
    if (!Number.isFinite(dia_mes) || dia_mes < 1 || dia_mes > 31)
      return { error: "El día del mes debe estar entre 1 y 31." };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio))
      return { error: "La fecha de inicio no es válida." };

    const { data: cuenta, error: cuentaErr } = await supabase
      .from("cuentas")
      .select("id, moneda")
      .eq("id", cuenta_id)
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (cuentaErr || !cuenta)
      return { error: "La cuenta no existe o no te pertenece." };
    if (cuenta.moneda !== moneda)
      return { error: "La moneda del gasto fijo debe coincidir con la de la cuenta." };

    const { data: updated, error } = await supabase
      .from("gastos_fijos")
      .update({
        cuenta_id,
        categoria_id: categoria_id || null,
        descripcion,
        monto,
        moneda,
        dia_mes,
        fecha_inicio,
        activo: activoRaw !== "0",
      })
      .eq("id", gasto_fijo_id)
      .eq("usuario_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase editarGastoFijo:", error);
      return { error: "No se pudo editar el gasto fijo." };
    }
    if (!updated) return { error: "El gasto fijo no existe o no te pertenece." };

    revalidatePath("/gastos-fijos");
    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

export async function eliminarGastoFijo(gastoFijoId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();
    const { data, error } = await supabase
      .from("gastos_fijos")
      .delete()
      .eq("id", gastoFijoId)
      .eq("usuario_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase eliminarGastoFijo:", error);
      return { error: "No se pudo eliminar el gasto fijo." };
    }
    if (!data) return { error: "El gasto fijo no existe o no te pertenece." };

    revalidatePath("/gastos-fijos");
    revalidatePath("/dashboard");
    revalidatePath("/transacciones");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error inesperado." };
  }
}
