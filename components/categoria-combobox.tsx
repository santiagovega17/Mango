"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface CategoriaOption {
  id: string;
  nombre: string;
  color: string | null;
}

interface Props {
  categorias: CategoriaOption[];
  value: string; // "" = sin categoría
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CategoriaCombobox({
  categorias,
  value,
  onChange,
  disabled = false,
  placeholder = "Sin categoría",
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = categorias.find((c) => c.id === value);

  function handleSelect(id: string) {
    // toggle: seleccionar de nuevo deselecciona
    onChange(value === id ? "" : id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-11 bg-secondary/50 border-border/80 font-normal",
            "hover:bg-secondary/80 transition-colors",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                {selected.color && (
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selected.color }}
                  />
                )}
                <span className="truncate">{selected.nombre}</span>
              </>
            ) : (
              <>
                <Tag className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                <span>{placeholder}</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar categoría…" autoFocus />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {/* Opción para quitar la categoría */}
              <CommandItem
                value="__ninguna__"
                onSelect={() => { onChange(""); setOpen(false); }}
                className="text-muted-foreground italic"
              >
                <Check
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                Sin categoría
              </CommandItem>
            </CommandGroup>

            {categorias.length > 0 && (
              <CommandGroup heading="Categorías">
                {categorias.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={cat.nombre} // cmdk filtra por este string
                    onSelect={() => handleSelect(cat.id)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        value === cat.id ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    {cat.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    <span className="flex-1 truncate">{cat.nombre}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
