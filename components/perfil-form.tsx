"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { actualizarPerfil } from "@/lib/actions";

interface Props {
  nombre: string;
  monedaPrincipal: "ARS" | "USD";
}

export function PerfilForm({ nombre, monedaPrincipal }: Props) {
  const [moneda, setMoneda] = useState<"ARS" | "USD">(monedaPrincipal);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set("moneda_principal", moneda);

    startTransition(async () => {
      const result = await actualizarPerfil(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre */}
      <div className="space-y-2">
        <Label
          htmlFor="perfil-nombre"
          className="text-xs uppercase tracking-wider text-muted-foreground"
        >
          Nombre
        </Label>
        <Input
          id="perfil-nombre"
          name="nombre"
          defaultValue={nombre}
          placeholder="Tu nombre"
          required
          className="bg-secondary/50 border-border/80 h-11"
        />
      </div>

      {/* Moneda principal */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Moneda principal
        </Label>
        <p className="text-xs text-muted-foreground/70">
          Define en qué moneda se muestran los totales por defecto.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["ARS", "USD"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMoneda(m)}
              className={`h-11 rounded-lg border text-sm font-medium transition-all ${
                moneda === m
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              {m === "ARS" ? "🇦🇷  Pesos (ARS)" : "🇺🇸  Dólares (USD)"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="py-2.5">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Perfil actualizado correctamente.</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isPending} className="w-full gap-2">
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Guardar cambios
          </>
        )}
      </Button>
    </form>
  );
}
