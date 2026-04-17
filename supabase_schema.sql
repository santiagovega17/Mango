-- =============================================================================
-- MANGO — Esquema de base de datos PostgreSQL para Supabase
-- =============================================================================
-- Instrucciones:
--   1. Abre el SQL Editor en tu proyecto de Supabase
--      (https://supabase.com/dashboard → SQL Editor)
--   2. Pega este archivo completo y ejecuta (Run All)
--   3. Las tablas se crean con RLS habilitado y políticas de acceso por usuario
-- =============================================================================


-- ---------------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ---------------------------------------------------------------------------

CREATE TYPE moneda_tipo AS ENUM ('ARS', 'USD');

CREATE TYPE transaccion_tipo AS ENUM ('ingreso', 'egreso', 'transferencia');


-- ---------------------------------------------------------------------------
-- TABLA: usuarios
-- Extiende auth.users de Supabase con datos de perfil de la app.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usuarios (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre           TEXT        NOT NULL,
  moneda_principal moneda_tipo NOT NULL DEFAULT 'ARS',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.usuarios IS
  'Perfiles de usuario vinculados a auth.users. Se crea automáticamente al registrarse.';


-- ---------------------------------------------------------------------------
-- TABLA: cuentas
-- Cuentas bancarias, billeteras, cajas, etc. de cada usuario.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cuentas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre        TEXT        NOT NULL,
  tipo          TEXT        NOT NULL,           -- ej: 'banco', 'efectivo', 'billetera_virtual'
  moneda        moneda_tipo NOT NULL DEFAULT 'ARS',
  saldo_inicial NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cuentas IS
  'Cuentas financieras del usuario (bancos, cajas, billeteras virtuales, etc.).';

CREATE INDEX IF NOT EXISTS idx_cuentas_usuario ON public.cuentas(usuario_id);


-- ---------------------------------------------------------------------------
-- TABLA: categorias
-- Categorías de transacciones. usuario_id = NULL indica categorías globales
-- (precargadas por el sistema). Las categorías propias tienen usuario_id.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categorias (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID        REFERENCES public.usuarios(id) ON DELETE CASCADE,  -- NULL = global
  nombre     TEXT        NOT NULL,
  icono      TEXT,                    -- nombre de ícono Lucide, ej: 'shopping-cart'
  color      TEXT,                    -- color hex, ej: '#F5A623'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.categorias IS
  'Categorías de transacciones. usuario_id NULL indica categoría global del sistema.';

CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON public.categorias(usuario_id);


-- ---------------------------------------------------------------------------
-- TABLA: transacciones
-- Movimientos de dinero: ingresos, egresos y transferencias entre cuentas.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transacciones (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID             NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cuenta_id    UUID             NOT NULL REFERENCES public.cuentas(id) ON DELETE RESTRICT,
  categoria_id UUID             REFERENCES public.categorias(id) ON DELETE SET NULL,
  monto        NUMERIC(15, 2)   NOT NULL CHECK (monto > 0),
  tipo         transaccion_tipo NOT NULL,
  moneda       moneda_tipo      NOT NULL DEFAULT 'ARS',
  descripcion  TEXT,
  fecha        DATE             NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transacciones IS
  'Registro de todos los movimientos financieros del usuario.';

CREATE INDEX IF NOT EXISTS idx_transacciones_usuario  ON public.transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_cuenta   ON public.transacciones(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha    ON public.transacciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo     ON public.transacciones(tipo);


-- ---------------------------------------------------------------------------
-- TABLA: inversiones
-- Activos de inversión: acciones, criptomonedas, plazos fijos, etc.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inversiones (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID           NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre_activo  TEXT           NOT NULL,    -- ej: 'BTC', 'AAPL', 'CEDEAR YPF'
  cantidad       NUMERIC(20, 8) NOT NULL CHECK (cantidad > 0),
  precio_compra  NUMERIC(15, 2) NOT NULL CHECK (precio_compra > 0),
  moneda         moneda_tipo    NOT NULL DEFAULT 'USD',
  tipo_activo    TEXT           NOT NULL,    -- ej: 'crypto', 'accion', 'bono', 'plazo_fijo'
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.inversiones IS
  'Portafolio de inversiones del usuario (cripto, acciones, bonos, plazos fijos, etc.).';

CREATE INDEX IF NOT EXISTS idx_inversiones_usuario ON public.inversiones(usuario_id);


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Activar RLS en todas las tablas de negocio
ALTER TABLE public.usuarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inversiones  ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- POLÍTICAS: usuarios
-- ---------------------------------------------------------------------------

-- SELECT: cada usuario solo ve su propio perfil
CREATE POLICY "usuarios_select_own"
  ON public.usuarios FOR SELECT
  USING (auth.uid() = id);

-- INSERT: solo puede insertar su propio perfil (id debe coincidir con auth.uid())
CREATE POLICY "usuarios_insert_own"
  ON public.usuarios FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: solo puede actualizar su propio perfil
CREATE POLICY "usuarios_update_own"
  ON public.usuarios FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: solo puede eliminar su propio perfil
CREATE POLICY "usuarios_delete_own"
  ON public.usuarios FOR DELETE
  USING (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- POLÍTICAS: cuentas
-- ---------------------------------------------------------------------------

CREATE POLICY "cuentas_select_own"
  ON public.cuentas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "cuentas_insert_own"
  ON public.cuentas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "cuentas_update_own"
  ON public.cuentas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "cuentas_delete_own"
  ON public.cuentas FOR DELETE
  USING (auth.uid() = usuario_id);


-- ---------------------------------------------------------------------------
-- POLÍTICAS: categorias
-- Las categorías globales (usuario_id IS NULL) son visibles por todos.
-- Las categorías propias solo son visibles/modificables por su dueño.
-- ---------------------------------------------------------------------------

-- SELECT: categorías propias + categorías globales del sistema
CREATE POLICY "categorias_select_own_or_global"
  ON public.categorias FOR SELECT
  USING (
    usuario_id IS NULL                  -- categoría global
    OR auth.uid() = usuario_id          -- categoría propia
  );

-- INSERT: solo puede crear categorías propias
CREATE POLICY "categorias_insert_own"
  ON public.categorias FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- UPDATE: solo puede modificar sus propias categorías
CREATE POLICY "categorias_update_own"
  ON public.categorias FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- DELETE: solo puede eliminar sus propias categorías
CREATE POLICY "categorias_delete_own"
  ON public.categorias FOR DELETE
  USING (auth.uid() = usuario_id);


-- ---------------------------------------------------------------------------
-- POLÍTICAS: transacciones
-- ---------------------------------------------------------------------------

CREATE POLICY "transacciones_select_own"
  ON public.transacciones FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "transacciones_insert_own"
  ON public.transacciones FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "transacciones_update_own"
  ON public.transacciones FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "transacciones_delete_own"
  ON public.transacciones FOR DELETE
  USING (auth.uid() = usuario_id);


-- ---------------------------------------------------------------------------
-- POLÍTICAS: inversiones
-- ---------------------------------------------------------------------------

CREATE POLICY "inversiones_select_own"
  ON public.inversiones FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "inversiones_insert_own"
  ON public.inversiones FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "inversiones_update_own"
  ON public.inversiones FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "inversiones_delete_own"
  ON public.inversiones FOR DELETE
  USING (auth.uid() = usuario_id);


-- =============================================================================
-- FUNCIÓN + TRIGGER: Auto-crear perfil al registrarse
-- Cuando un usuario se registra en auth.users, se inserta automáticamente
-- un registro en public.usuarios con su id y nombre (del email).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, moneda_principal)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    'ARS'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- DATOS SEMILLA: Categorías globales del sistema
-- =============================================================================

INSERT INTO public.categorias (id, usuario_id, nombre, icono, color) VALUES
  (gen_random_uuid(), NULL, 'Alimentación',       'shopping-cart',   '#F5A623'),
  (gen_random_uuid(), NULL, 'Transporte',          'car',             '#4A90D9'),
  (gen_random_uuid(), NULL, 'Vivienda',             'home',            '#7ED321'),
  (gen_random_uuid(), NULL, 'Salud',                'heart-pulse',     '#D0021B'),
  (gen_random_uuid(), NULL, 'Entretenimiento',     'tv',              '#9B59B6'),
  (gen_random_uuid(), NULL, 'Educación',            'book-open',       '#1ABC9C'),
  (gen_random_uuid(), NULL, 'Ropa y calzado',       'shirt',           '#E67E22'),
  (gen_random_uuid(), NULL, 'Servicios',            'zap',             '#3498DB'),
  (gen_random_uuid(), NULL, 'Restaurantes',         'utensils',        '#E74C3C'),
  (gen_random_uuid(), NULL, 'Viajes',               'plane',           '#2ECC71'),
  (gen_random_uuid(), NULL, 'Tecnología',           'monitor',         '#8E44AD'),
  (gen_random_uuid(), NULL, 'Mascotas',             'paw-print',       '#F39C12'),
  (gen_random_uuid(), NULL, 'Regalos y donaciones', 'gift',            '#E91E63'),
  (gen_random_uuid(), NULL, 'Inversiones',          'trending-up',     '#00BCD4'),
  (gen_random_uuid(), NULL, 'Sueldo',               'briefcase',       '#4CAF50'),
  (gen_random_uuid(), NULL, 'Freelance',            'laptop',          '#FF9800'),
  (gen_random_uuid(), NULL, 'Deportes',             'dumbbell',        '#10B981'),
  (gen_random_uuid(), NULL, 'Trabajo',              'briefcase',       '#6366F1'),
  (gen_random_uuid(), NULL, 'Juntadas y salidas',   'users',           '#EC4899'),
  (gen_random_uuid(), NULL, 'Otros ingresos',       'circle-dollar-sign', '#607D8B'),
  (gen_random_uuid(), NULL, 'Otros gastos',         'circle-minus',    '#9E9E9E')
ON CONFLICT DO NOTHING;
