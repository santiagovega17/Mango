import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInversiones, fetchDolarBlue } from "@/lib/data";
import { InversionesCartera } from "@/components/inversiones-cartera";
import { NuevaInversionDialog } from "@/components/nueva-inversion-dialog";

export default async function InversionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [inversiones, dolarBlue] = await Promise.all([
    getInversiones(user.id),
    fetchDolarBlue(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Mi Cartera
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seguimiento de tus inversiones y rendimiento.
          </p>
        </div>
        {inversiones.length > 0 && <NuevaInversionDialog />}
      </div>

      {/* Cartera */}
      <InversionesCartera inversiones={inversiones} dolarBlue={dolarBlue} />
    </div>
  );
}
