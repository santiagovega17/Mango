/**
 * Normaliza texto numérico típico en es-AR antes de parseFloat en server actions.
 * - "12,5" → "12.5"
 * - "1.234,56" (miles con punto, decimal con coma) → "1234.56"
 * - "10.5" (solo punto decimal) → sin cambio
 * No intenta cubrir todos los formatos internacionales; alcanza para pegados
 * ocasionales además del valor que envía input type="number" (punto decimal).
 */
export function normalizeDecimalInput(raw: string): string {
  const s = String(raw).trim();
  if (!s) return "";
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    return s.replace(/\./g, "").replace(",", ".");
  }
  if (s.includes(",") && !s.includes(".")) {
    return s.replace(",", ".");
  }
  return s;
}

/** parseFloat tras normalizar; NaN si vacío o inválido. */
export function parseFormDecimal(
  value: FormDataEntryValue | null | undefined
): number {
  const raw = value == null ? "" : String(value).trim();
  return parseFloat(normalizeDecimalInput(raw));
}
