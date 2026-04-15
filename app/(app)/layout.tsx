import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Doble verificación (el middleware ya redirige, pero esto es un safety net)
  if (!user) {
    redirect("/login");
  }

  // Obtenemos el perfil del usuario para mostrar nombre en el Navbar
  const { data: profile } = await supabase
    .from("usuarios")
    .select("nombre")
    .eq("id", user.id)
    .single();

  const userName =
    profile?.nombre ?? user.email?.split("@")[0] ?? "Usuario";

  return (
    <>
      <Navbar userEmail={user.email ?? ""} userName={userName} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </>
  );
}
