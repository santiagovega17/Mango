import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas protegidas — redirigen a /login si no hay sesión
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/transacciones",
  "/inversiones",
  "/configuracion",
];
// Rutas de autenticación — redirigen a /dashboard si ya está logueado
const AUTH_ROUTES = ["/login"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(pathname);
}

export async function middleware(request: NextRequest) {
  // Clonamos la respuesta para poder modificar las cookies de sesión
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagamos las cookies al request y a la respuesta
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: No ejecutar ningún código entre createServerClient y getUser().
  // getUser() refresca el token de sesión si está por expirar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Usuario NO autenticado intentando acceder a ruta protegida → /login
  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Guardamos la ruta original para redirigir después del login (opcional futuro)
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario YA autenticado intentando acceder a /login → Dashboard
  if (user && isAuthRoute(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  // En cualquier otro caso devolvemos la respuesta con las cookies actualizadas
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas EXCEPTO:
     * - Archivos estáticos de Next.js (_next/static, _next/image)
     * - favicon.ico
     * - Archivos de imagen y fuentes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
