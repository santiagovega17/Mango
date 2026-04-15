"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  User,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn, signUp } from "@/app/auth/actions";

// ── Helper: campo con ícono ───────────────────────────────────────────────
function InputField({
  id,
  name,
  label,
  type,
  placeholder,
  icon: Icon,
  rightElement,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  placeholder: string;
  icon: React.ElementType;
  rightElement?: React.ReactNode;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
        <Input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="pl-10 pr-10 bg-secondary/50 border-border/80 focus-visible:ring-primary/50 h-11"
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulario de Login ───────────────────────────────────────────────────
function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        id="login-email"
        name="email"
        label="Email"
        type="email"
        placeholder="tu@email.com"
        icon={Mail}
        autoComplete="email"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="login-password"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            Contraseña
          </Label>
          <Link
            href="#"
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="pl-10 pr-10 bg-secondary/50 border-border/80 focus-visible:ring-primary/50 h-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full h-11 font-semibold"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ingresando…
          </>
        ) : (
          "Ingresar"
        )}
      </Button>
    </form>
  );
}

// ── Formulario de Registro ────────────────────────────────────────────────
function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        id="register-nombre"
        name="nombre"
        label="Nombre"
        type="text"
        placeholder="Tu nombre"
        icon={User}
        autoComplete="name"
      />

      <InputField
        id="register-email"
        name="email"
        label="Email"
        type="email"
        placeholder="tu@email.com"
        icon={Mail}
        autoComplete="email"
      />

      {/* Contraseña */}
      <div className="space-y-2">
        <Label
          htmlFor="register-password"
          className="text-muted-foreground text-xs uppercase tracking-wider"
        >
          Contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            required
            minLength={6}
            className="pl-10 pr-10 bg-secondary/50 border-border/80 focus-visible:ring-primary/50 h-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            aria-label={showPassword ? "Ocultar" : "Mostrar"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirmar contraseña */}
      <div className="space-y-2">
        <Label
          htmlFor="register-confirm"
          className="text-muted-foreground text-xs uppercase tracking-wider"
        >
          Confirmar contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            id="register-confirm"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
            required
            className="pl-10 pr-10 bg-secondary/50 border-border/80 focus-visible:ring-primary/50 h-11"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            aria-label={showConfirm ? "Ocultar" : "Mostrar"}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="py-2.5">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-sm">{success}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full h-11 font-semibold"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creando cuenta…
          </>
        ) : (
          "Crear cuenta"
        )}
      </Button>
    </form>
  );
}

// ── Página principal de Login ─────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 select-none">
          <span className="text-4xl">🥭</span>
          <span className="text-3xl font-bold tracking-tight text-foreground">
            Mango
          </span>
        </Link>
        <p className="text-muted-foreground text-sm mt-2">
          Tu finanzas personales, bajo control
        </p>
      </div>

      {/* Card con Tabs */}
      <Card className="border-border shadow-2xl shadow-black/40">
        <CardHeader className="pb-0 pt-6">
          <CardTitle className="text-lg font-semibold text-center">
            Accedé a tu cuenta
          </CardTitle>
          <CardDescription className="text-center text-xs mt-1">
            Gestioná tus finanzas en ARS y USD
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5 pb-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-5">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        Al continuar, aceptás los{" "}
        <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Términos de uso
        </Link>{" "}
        y la{" "}
        <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Política de privacidad
        </Link>
        .
      </p>
    </div>
  );
}
