"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type AuthResult =
  | { error: string; success?: never }
  | { success: string; error?: never };

// ---------------------------------------------------------------------------
// Traducción de mensajes de error de Supabase al español
// ---------------------------------------------------------------------------
function traducirError(message: string): string {
  const mapa: Record<string, string> = {
    "Invalid login credentials":
      "Email o contraseña incorrectos.",
    "Email not confirmed":
      "Debés confirmar tu email antes de ingresar. Revisá tu bandeja de entrada.",
    "User already registered":
      "Ya existe una cuenta con ese email.",
    "Password should be at least 6 characters":
      "La contraseña debe tener al menos 6 caracteres.",
    "Unable to validate email address: invalid format":
      "El formato del email no es válido.",
    "Email rate limit exceeded":
      "Demasiados intentos. Esperá unos minutos antes de volver a intentarlo.",
    "Signup requires a valid password":
      "La contraseña no es válida.",
    "over_email_send_rate_limit":
      "Límite de envíos alcanzado. Intentá en unos minutos.",
  };
  // Búsqueda parcial para mensajes que no coinciden exactamente
  for (const [key, value] of Object.entries(mapa)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return "Ocurrió un error inesperado. Intentá de nuevo.";
}

// ---------------------------------------------------------------------------
// Iniciar sesión
// ---------------------------------------------------------------------------
export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Completá todos los campos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: traducirError(error.message) };
  }

  redirect("/");
}

// ---------------------------------------------------------------------------
// Registrarse
// ---------------------------------------------------------------------------
export async function signUp(formData: FormData): Promise<AuthResult> {
  const nombre = (formData.get("nombre") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!nombre || !email || !password || !confirmPassword) {
    return { error: "Completá todos los campos." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre },
    },
  });

  if (error) {
    return { error: traducirError(error.message) };
  }

  // Si el email ya existía pero no está confirmado, Supabase devuelve user
  // con identities vacío — tratarlo como ya registrado
  if (data.user && data.user.identities?.length === 0) {
    return { error: "Ya existe una cuenta con ese email." };
  }

  return {
    success:
      "¡Cuenta creada con éxito! Revisá tu email para confirmar el registro y luego ingresá.",
  };
}

// ---------------------------------------------------------------------------
// Cerrar sesión
// ---------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
