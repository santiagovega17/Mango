-- Ingresos futuros / por cobrar: montos pendientes (fecha opcional) y vínculo al ingreso real.
-- Ejecutar en SQL Editor de Supabase después de tener el esquema base.

CREATE TABLE IF NOT EXISTS public.ingresos_futuros (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID           NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cuenta_id       UUID           NOT NULL REFERENCES public.cuentas(id) ON DELETE RESTRICT,
  monto           NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
  moneda          moneda_tipo    NOT NULL DEFAULT 'ARS',
  descripcion     TEXT,
  fecha_esperada  DATE,
  cobrado_at      TIMESTAMPTZ,
  transaccion_id  UUID           UNIQUE REFERENCES public.transacciones(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT ingresos_futuros_cobrado_sync CHECK (
    (cobrado_at IS NULL AND transaccion_id IS NULL)
    OR (cobrado_at IS NOT NULL AND transaccion_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.ingresos_futuros IS
  'Ingresos pendientes de cobro; al cobrar se crea una transacción tipo ingreso.';

CREATE INDEX IF NOT EXISTS idx_ingresos_futuros_usuario ON public.ingresos_futuros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_futuros_pendiente
  ON public.ingresos_futuros(usuario_id)
  WHERE cobrado_at IS NULL;

ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS ingreso_futuro_id UUID REFERENCES public.ingresos_futuros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacciones_ingreso_futuro ON public.transacciones(ingreso_futuro_id);

ALTER TABLE public.ingresos_futuros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingresos_futuros_select_own"
  ON public.ingresos_futuros FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "ingresos_futuros_insert_own"
  ON public.ingresos_futuros FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "ingresos_futuros_update_own"
  ON public.ingresos_futuros FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "ingresos_futuros_delete_own"
  ON public.ingresos_futuros FOR DELETE
  USING (auth.uid() = usuario_id);
