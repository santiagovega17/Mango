ALTER TABLE public.inversiones
  ADD COLUMN IF NOT EXISTS vendida_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_venta DATE,
  ADD COLUMN IF NOT EXISTS precio_venta NUMERIC(15, 4);

CREATE INDEX IF NOT EXISTS idx_inversiones_vendida_at
  ON public.inversiones(usuario_id, vendida_at);
