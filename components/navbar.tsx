"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  CalendarRange,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/app/auth/actions";
import { NuevaTransaccionDialog } from "@/components/nueva-transaccion-dialog";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacciones", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/inversiones", label: "Inversiones", icon: TrendingUp },
  { href: "/cuotas", label: "Cuotas", icon: CalendarClock },
  { href: "/resumen", label: "Resumen anual", icon: CalendarRange },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

interface NavbarProps {
  userEmail: string;
  userName: string;
}

export function Navbar({ userEmail, userName }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      router.push("/login");
      router.refresh();
    });
  }

  // Iniciales del usuario para el avatar
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md print:hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 select-none"
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-2xl">🥭</span>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Mango
            </span>
          </Link>

          {/* Nav Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Botón + Nuevo Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <NuevaTransaccionDialog compact />
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                  {initials}
                </div>
                <span className="text-sm text-muted-foreground max-w-[120px] truncate hidden lg:block">
                  {userName}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                    userMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  {/* Overlay para cerrar al hacer click fuera */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-20 w-56 rounded-xl border border-border bg-card shadow-xl shadow-black/30 py-1 animate-fade-in">
                    <div className="px-3 py-2.5 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {userEmail}
                      </p>
                    </div>
                    <Link
                      href="/configuracion"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Mi perfil
                    </Link>
                    <Separator className="my-1" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleSignOut();
                      }}
                      disabled={isPending}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-400/10 transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hamburguesa Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Menú Mobile */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <div className="mx-auto max-w-7xl px-4 py-3 space-y-1">
            {/* Info de usuario mobile */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-secondary/50 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            </div>

            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}

            <Separator className="my-2" />

            {/* Acceso rápido mobile */}
            <div className="px-1 pb-1">
              <NuevaTransaccionDialog />
            </div>

            <Separator className="my-2" />

            <button
              onClick={() => {
                setMobileOpen(false);
                handleSignOut();
              }}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-rose-400 hover:bg-rose-400/10 transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
