/**
 * Helpers de tipo de cuenta (sin imports de servidor — seguros en Client Components).
 */

/** Cuenta broker (donde se custodian activos de la cartera). */
export function esCuentaBrokerInversion(tipo: string): boolean {
  return tipo.trim().toLowerCase() === "inversion";
}
