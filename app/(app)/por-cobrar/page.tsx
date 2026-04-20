import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getIngresosFuturos, getCuentasUsuario } from "@/lib/data";
import { IngresosFuturosPanel } from "@/components/ingresos-futuros-panel";
import { Button } from "@/components/ui/button";

export default async function PorCobrarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ pendientes, cobrados }, cuentas] = await Promise.all([
    getIngresosFuturos(user.id),
    getCuentasUsuario(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Por cobrar
          </h1>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>

      <IngresosFuturosPanel
        pendientes={pendientes}
        cobrados={cobrados}
        cuentas={cuentas}
      />
    </div>
  );
}
