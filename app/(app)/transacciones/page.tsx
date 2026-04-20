import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTransacciones, getCuentasUsuario } from "@/lib/data";
import { TransaccionesTable } from "@/components/transacciones-table";

export default async function TransaccionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [transacciones, cuentas] = await Promise.all([
    getTransacciones(user.id),
    getCuentasUsuario(user.id),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Transacciones
          </h1>
        </div>
      </div>

      {/* Tabla con filtros */}
      <TransaccionesTable transacciones={transacciones} cuentas={cuentas} />
    </div>
  );
}
