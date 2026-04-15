import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Mango — Control Financiero",
    template: "%s | Mango",
  },
  description: "Gestión de finanzas personales e inversiones en ARS y USD.",
  themeColor: "#121212",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`}>
        {children}
      </body>
    </html>
  );
}
