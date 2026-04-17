"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const listId = useId();
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categorias;
    return categorias.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [categorias, query]);

  const selected = categorias.find((c) => c.id === value);
  const rowCount = 1 + filtered.length;

  useEffect(() => {
    setHighlight(-1);
  }, [query]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    setQuery("");
    setHighlight(-1);
  }, [open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  function handleSelectCategory(id: string) {
    onChange(value === id ? "" : id);
    setOpen(false);
  }

  function clearAndClose() {
    onChange("");
    setOpen(false);
  }

  function applyHighlight(index: number) {
    if (index < 0 || index >= rowCount) setHighlight(-1);
    else setHighlight(index);
  }

  function confirmHighlight(index: number) {
    if (index === 0) {
      clearAndClose();
      return;
    }
    const cat = filtered[index - 1];
    if (cat) handleSelectCategory(cat.id);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
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
                    aria-hidden
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
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="rounded-xl border-0 overflow-hidden">
          <div className="p-2 border-b border-border/60">
            <label htmlFor={searchId} className="sr-only">
              Buscar categoría
            </label>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none"
                aria-hidden
              />
              <Input
                ref={searchRef}
                id={searchId}
                type="search"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    applyHighlight(
                      highlight < 0 ? 0 : Math.min(highlight + 1, rowCount - 1)
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    applyHighlight(highlight <= 0 ? -1 : highlight - 1);
                  } else if (e.key === "Enter") {
                    if (highlight >= 0) {
                      e.preventDefault();
                      confirmHighlight(highlight);
                    }
                  } else if (e.key === "Escape") {
                    setQuery("");
                    setHighlight(-1);
                  }
                }}
                placeholder="Buscar categoría…"
                autoComplete="off"
                className="h-10 pl-9 bg-secondary/50 border-border/80"
              />
            </div>
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label="Categorías"
            className="max-h-[220px] overflow-y-auto p-1.5 space-y-0.5"
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={clearAndClose}
              onMouseEnter={() => setHighlight(0)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                highlight === 0 ? "bg-accent" : "hover:bg-accent/60",
                !value ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Check
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  !value ? "opacity-100 text-primary" : "opacity-0"
                )}
              />
              <span className="italic">Sin categoría</span>
            </button>

            {filtered.length === 0 && (query.trim() || categorias.length === 0) ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                {query.trim()
                  ? "No hay categorías que coincidan."
                  : "No hay categorías todavía."}
              </p>
            ) : filtered.length > 0 ? (
              filtered.map((cat, i) => {
                const rowIndex = i + 1;
                const isSelected = value === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectCategory(cat.id)}
                    onMouseEnter={() => setHighlight(rowIndex)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      highlight === rowIndex ? "bg-accent" : "hover:bg-accent/60"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isSelected ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    {cat.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                        aria-hidden
                      />
                    )}
                    <span className="flex-1 truncate">{cat.nombre}</span>
                  </button>
                );
              })
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
