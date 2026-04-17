"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const listId = useId();
  const searchId = useId();

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

  function handleSelectCategory(id: string) {
    onChange(value === id ? "" : id);
  }

  function applyHighlight(index: number) {
    if (index < 0 || index >= rowCount) setHighlight(-1);
    else setHighlight(index);
  }

  function confirmHighlight(index: number) {
    if (index === 0) {
      onChange("");
      return;
    }
    const cat = filtered[index - 1];
    if (cat) handleSelectCategory(cat.id);
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-secondary/30 overflow-hidden",
        disabled && "opacity-60"
      )}
      aria-disabled={disabled}
    >
      {/* Estado de selección (siempre visible) */}
      <div className="flex items-center gap-2 min-h-11 px-3 py-2 border-b border-border/60 bg-background/40">
        {selected ? (
          <>
            {selected.color && (
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selected.color }}
                aria-hidden
              />
            )}
            <span className="truncate text-sm flex-1">{selected.nombre}</span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline flex-shrink-0"
              onClick={() => onChange("")}
              disabled={disabled}
            >
              Quitar
            </button>
          </>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tag className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
            {placeholder}
          </span>
        )}
      </div>

      {/* Búsqueda siempre visible (filtra sin abrir panel) */}
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
            id={searchId}
            type="search"
            role="combobox"
            aria-expanded={true}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                applyHighlight(highlight < 0 ? 0 : Math.min(highlight + 1, rowCount - 1));
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
            disabled={disabled}
            autoComplete="off"
            className="h-10 pl-9 bg-background/80 border-border/80"
          />
        </div>
      </div>

      {/* Lista elegible con clic o teclado */}
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
          disabled={disabled}
          onClick={() => onChange("")}
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
                disabled={disabled}
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
  );
}
