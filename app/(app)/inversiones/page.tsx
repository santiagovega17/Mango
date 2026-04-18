import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCarteraInversionesPorBroker, fetchDolarBlue } from "@/lib/data";
import { InversionesCartera } from "@/components/inversiones-cartera";
import { NuevaInversionDialog } from "@/components/nueva-inversion-dialog";

export default async function InversionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [cartera, dolarBlue] = await Promise.all([
    getCarteraInversionesPorBroker(user.id),
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
            Por cuenta broker: posiciones, saldo y estimado no invertido.
          </p>
        </div>
        <NuevaInversionDialog />
      </div>

      {/* Cartera */}
      <InversionesCartera
        brokers={cartera.brokers}
        sinBroker={cartera.sinBroker}
        dolarBlue={dolarBlue}
      />
    </div>
  );
}
