/** Suma `meses` a una fecha ISO YYYY-MM-DD (mediodía UTC-local safe). */
export function addMonthsToISODate(iso: string, meses: number): string {
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1 + meses, d);
  return dt.toISOString().slice(0, 10);
}

/** Próxima cuota a pagar: la fecha de la cuota número (pagadas + 1). */
export function fechaProximaCuota(
  fechaPrimera: string,
  cuotasPagadas: number,
  cantidadCuotas: number
): string | null {
  if (cuotasPagadas >= cantidadCuotas) return null;
  return addMonthsToISODate(fechaPrimera, cuotasPagadas);
}
