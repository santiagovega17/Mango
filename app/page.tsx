import Link from "next/link";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  DollarSign,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    title: "Cotizaciones en tiempo real",
    description:
      "Dólar Blue, MEP y Oficial actualizados automáticamente. Sabé exactamente cuánto vale tu cartera en cada moneda en todo momento.",
  },
  {
    icon: DollarSign,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    title: "Gestión Bimoneda ARS/USD",
    description:
      "Registrá ingresos, egresos e inversiones tanto en pesos como en dólares. Mango convierte y consolida todo automáticamente.",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    title: "Seguridad de nivel bancario",
    description:
      "Tus datos están protegidos con Row Level Security de Supabase. Solo vos podés ver y modificar tu información financiera.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar mínima ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 select-none">
              <span className="text-2xl">🥭</span>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Mango
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Ir al Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Comenzar gratis
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Fondo con gradiente radial */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute left-1/4 top-1/3 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-amber-500/5 blur-2xl" />
          <div className="absolute right-1/4 top-1/2 h-[200px] w-[300px] rounded-full bg-sky-500/5 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Finanzas personales bimoneda · ARS + USD
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl mx-auto leading-tight">
            Tus finanzas en{" "}
            <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
              Pesos y Dólares
            </span>
            , en un solo lugar
          </h1>

          {/* Subtítulo */}
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Mango te da control total sobre tus finanzas personales. Registrá
            ingresos, egresos e inversiones en ARS y USD, con cotizaciones del
            Dólar Blue actualizadas al instante.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                Ir al Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                  Comenzar gratis
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#features"
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  Saber más
                  <ChevronDown className="h-5 w-5" />
                </a>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "100%", label: "Gratuito" },
              { value: "ARS + USD", label: "Bimoneda" },
              { value: "∞", label: "Transacciones" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview / decoración */}
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24">
          <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-1 shadow-2xl shadow-black/40">
            <div className="rounded-xl border border-border/40 bg-background/80 p-6">
              {/* Mock mini-dashboard */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-rose-500/60" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 h-5 rounded bg-secondary/50 max-w-48 mx-auto" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Saldo ARS", value: "$ 1.240.500", color: "text-sky-400", bg: "bg-sky-400/10" },
                  { label: "Saldo USD", value: "u$s 2.850", color: "text-emerald-400", bg: "bg-emerald-400/10" },
                  { label: "Ingresos", value: "$ 380.000", color: "text-emerald-400", bg: "bg-emerald-400/10" },
                  { label: "Egresos", value: "$ 142.300", color: "text-rose-400", bg: "bg-rose-400/10" },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-border/60 bg-card/60 p-4"
                  >
                    <div className={`inline-flex rounded-lg p-1.5 ${card.bg} mb-3`}>
                      <BarChart3 className={`h-3.5 w-3.5 ${card.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className={`text-base font-bold tabular-nums mt-0.5 ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-24 rounded-xl border border-border/40 bg-secondary/20 flex items-center justify-center">
                <div className="flex items-end gap-1 h-12">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="w-4 rounded-sm bg-primary/30"
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Glow inferior */}
          <div className="pointer-events-none absolute -bottom-10 left-1/2 h-40 w-3/4 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
      </section>

      {/* ── Features Section ───────────────────────────────────────── */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header de sección */}
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
              Por qué Mango
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Todo lo que necesitás para tomar control
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Diseñado especialmente para el contexto económico argentino,
              donde manejar pesos y dólares al mismo tiempo es una necesidad.
            </p>
          </div>

          {/* Cards de features */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group relative rounded-2xl border ${feature.border} bg-card/40 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}
                >
                  {/* Glow en hover */}
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${feature.bg}`}
                  />
                  <div className="relative">
                    <div
                      className={`inline-flex items-center justify-center rounded-xl ${feature.bg} p-3 mb-5`}
                    >
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA bottom */}
          <div className="mt-16 text-center">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:-translate-y-0.5"
              >
                Ir al Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:-translate-y-0.5"
              >
                Empezar ahora, es gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Más features / Trust section ──────────────────────────── */}
      <section className="py-16 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            {[
              { icon: TrendingUp, label: "Cartera de inversiones", desc: "Seguí tus acciones, cedears, cripto y plazos fijos con rendimiento en tiempo real." },
              { icon: BarChart3, label: "Dashboard intuitivo", desc: "Gráficos y resúmenes claros que te muestran dónde va tu dinero cada mes." },
              { icon: ShieldCheck, label: "Tus datos, solo tuyos", desc: "Sin publicidad, sin venta de datos. Tu información financiera permanece privada." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="space-y-3">
                  <div className="inline-flex items-center justify-center rounded-xl bg-secondary p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{item.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥭</span>
              <span className="text-base font-bold text-foreground">Mango</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Mango · Control financiero bimoneda
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="hover:text-foreground transition-colors"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
