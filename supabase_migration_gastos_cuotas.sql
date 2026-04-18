-- Ejecutar en Supabase SQL Editor si la base ya existía antes de agregar cuotas.
-- (Si creás el proyecto desde cero con supabase_schema.sql actualizado, no hace falta.)

CREATE TABLE IF NOT EXISTS public.gastos_cuotas (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         UUID           NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cuenta_id          UUID           NOT NULL REFERENCES public.cuentas(id) ON DELETE RESTRICT,
  categoria_id       UUID           REFERENCES public.categorias(id) ON DELETE SET NULL,
  descripcion        TEXT           NOT NULL,
  monto_cuota        NUMERIC(15, 2) NOT NULL CHECK (monto_cuota > 0),
  cantidad_cuotas    INTEGER        NOT NULL CHECK (cantidad_cuotas >= 1),
  cuotas_pagadas     INTEGER        NOT NULL DEFAULT 0 CHECK (cuotas_pagadas >= 0),
  fecha_primera_cuota DATE         NOT NULL,
  activo             BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT gastos_cuotas_cuotas_check CHECK (cuotas_pagadas <= cantidad_cuotas)
);

CREATE INDEX IF NOT EXISTS idx_gastos_cuotas_usuario ON public.gastos_cuotas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gastos_cuotas_cuenta ON public.gastos_cuotas(cuenta_id);

ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS gasto_cuota_id UUID REFERENCES public.gastos_cuotas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacciones_gasto_cuota ON public.transacciones(gasto_cuota_id);

ALTER TABLE public.gastos_cuotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gastos_cuotas_select_own"
  ON public.gastos_cuotas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "gastos_cuotas_insert_own"
  ON public.gastos_cuotas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "gastos_cuotas_update_own"
  ON public.gastos_cuotas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "gastos_cuotas_delete_own"
  ON public.gastos_cuotas FOR DELETE
  USING (auth.uid() = usuario_id);
