import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCuentasUsuario, getGastosFijos } from "@/lib/data";
import { GastosFijosPanel } from "@/components/gastos-fijos-panel";

export default async function GastosFijosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [gastos, cuentas] = await Promise.all([
    getGastosFijos(user.id),
    getCuentasUsuario(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gastos fijos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurá egresos recurrentes mensuales. Al llegar el día definido, se
          registran automáticamente como transacción.
        </p>
      </div>

      <GastosFijosPanel gastos={gastos} cuentas={cuentas} />
    </div>
  );
}
