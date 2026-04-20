import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGastosCuotas, getCuentasUsuario } from "@/lib/data";
import { GastosCuotasPanel } from "@/components/gastos-cuotas-panel";

export default async function CuotasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [planes, cuentas] = await Promise.all([
    getGastosCuotas(user.id),
    getCuentasUsuario(user.id),
  ]);

  const cuentasARS = cuentas.filter((c) => c.moneda === "ARS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gastos en cuotas
        </h1>
      </div>

      <GastosCuotasPanel planes={planes} cuentasARS={cuentasARS} />
    </div>
  );
}
