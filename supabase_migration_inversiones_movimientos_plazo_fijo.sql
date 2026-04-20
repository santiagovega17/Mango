-- Historial de compras de inversiones + datos adicionales para plazo fijo.

ALTER TABLE public.inversiones
  ADD COLUMN IF NOT EXISTS tasa_anual NUMERIC(7, 4),
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

CREATE TABLE IF NOT EXISTS public.inversiones_movimientos (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID           NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  inversion_id    UUID           NOT NULL REFERENCES public.inversiones(id) ON DELETE CASCADE,
  fecha           DATE           NOT NULL DEFAULT CURRENT_DATE,
  cantidad        NUMERIC(20, 8) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(15, 4) NOT NULL CHECK (precio_unitario > 0),
  monto_total     NUMERIC(15, 2) NOT NULL CHECK (monto_total > 0),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.inversiones_movimientos IS
  'Historial de altas/compras por inversión para auditar promedio y costo acumulado.';

CREATE INDEX IF NOT EXISTS idx_inversiones_movimientos_usuario
  ON public.inversiones_movimientos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_inversiones_movimientos_inversion
  ON public.inversiones_movimientos(inversion_id, fecha DESC, created_at DESC);

ALTER TABLE public.inversiones_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inversiones_movimientos_select_own"
  ON public.inversiones_movimientos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "inversiones_movimientos_insert_own"
  ON public.inversiones_movimientos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "inversiones_movimientos_update_own"
  ON public.inversiones_movimientos FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "inversiones_movimientos_delete_own"
  ON public.inversiones_movimientos FOR DELETE
  USING (auth.uid() = usuario_id);
