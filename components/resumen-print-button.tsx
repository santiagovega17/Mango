"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResumenPrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      Imprimir o guardar PDF
    </Button>
  );
}
