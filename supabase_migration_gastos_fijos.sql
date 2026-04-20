-- Gastos fijos mensuales con descuento automático al vencimiento.
-- Ejecutar en SQL Editor de Supabase después de tener el esquema base.

CREATE TABLE IF NOT EXISTS public.gastos_fijos (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID           NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cuenta_id       UUID           NOT NULL REFERENCES public.cuentas(id) ON DELETE RESTRICT,
  categoria_id    UUID           REFERENCES public.categorias(id) ON DELETE SET NULL,
  descripcion     TEXT           NOT NULL,
  monto           NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
  moneda          moneda_tipo    NOT NULL DEFAULT 'ARS',
  dia_mes         INTEGER        NOT NULL CHECK (dia_mes >= 1 AND dia_mes <= 31),
  fecha_inicio    DATE           NOT NULL DEFAULT CURRENT_DATE,
  activo          BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.gastos_fijos IS
  'Gastos recurrentes mensuales. Al vencerse, se registra automáticamente un egreso.';

CREATE INDEX IF NOT EXISTS idx_gastos_fijos_usuario ON public.gastos_fijos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_activo ON public.gastos_fijos(usuario_id, activo);

ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS gasto_fijo_id UUID REFERENCES public.gastos_fijos(id) ON DELETE SET NULL;

ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS gasto_fijo_periodo DATE;

CREATE INDEX IF NOT EXISTS idx_transacciones_gasto_fijo ON public.transacciones(gasto_fijo_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_transacciones_gasto_fijo_periodo
  ON public.transacciones(gasto_fijo_id, gasto_fijo_periodo)
  WHERE gasto_fijo_id IS NOT NULL AND gasto_fijo_periodo IS NOT NULL;

ALTER TABLE public.gastos_fijos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gastos_fijos_select_own"
  ON public.gastos_fijos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "gastos_fijos_insert_own"
  ON public.gastos_fijos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "gastos_fijos_update_own"
  ON public.gastos_fijos FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "gastos_fijos_delete_own"
  ON public.gastos_fijos FOR DELETE
  USING (auth.uid() = usuario_id);
