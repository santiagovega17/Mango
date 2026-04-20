import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus, getCuentasUsuario } from "@/lib/data";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Bienvenida · Mango",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [status, cuentas] = await Promise.all([
    getOnboardingStatus(user.id),
    getCuentasUsuario(user.id),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-6 w-6" />
          <p className="text-xs font-semibold uppercase tracking-wider">
            Primeros pasos
          </p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bienvenida a Mango
        </h1>
      </div>

      <OnboardingWizard
        cuentaCount={status.cuentaCount}
        transaccionCount={status.transaccionCount}
        cuentas={cuentas}
      />

      <div className="text-center">
        <Link href="/dashboard" className="text-xs hover:text-foreground transition-colors">
          Omitir
        </Link>
      </div>
    </div>
  );
}
