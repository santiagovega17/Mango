-- Inversiones ligadas a cuenta broker (tipo inversión). Ejecutar en proyectos ya creados.

ALTER TABLE public.inversiones
  ADD COLUMN IF NOT EXISTS cuenta_id UUID REFERENCES public.cuentas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_inversiones_cuenta ON public.inversiones(cuenta_id);

COMMENT ON COLUMN public.inversiones.cuenta_id IS
  'Cuenta tipo inversión (broker) donde está la posición.';
