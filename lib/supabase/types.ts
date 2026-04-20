/**
 * Tipos TypeScript derivados del esquema de Supabase.
 * Cuando uses `supabase gen types typescript` estos se sobreescriben automáticamente.
 */

export type MonedaTipo = "ARS" | "USD";
export type TransaccionTipo = "ingreso" | "egreso" | "transferencia";

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          nombre: string;
          moneda_principal: MonedaTipo;
          created_at: string;
        };
        Insert: {
          id: string;
          nombre: string;
          moneda_principal?: MonedaTipo;
          created_at?: string;
        };
        Update: {
          nombre?: string;
          moneda_principal?: MonedaTipo;
        };
      };
      cuentas: {
        Row: {
          id: string;
          usuario_id: string;
          nombre: string;
          tipo: string;
          moneda: MonedaTipo;
          saldo_inicial: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          nombre: string;
          tipo: string;
          moneda: MonedaTipo;
          saldo_inicial?: number;
          created_at?: string;
        };
        Update: {
          nombre?: string;
          tipo?: string;
          moneda?: MonedaTipo;
          saldo_inicial?: number;
        };
      };
      categorias: {
        Row: {
          id: string;
          usuario_id: string | null;
          nombre: string;
          icono: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id?: string | null;
          nombre: string;
          icono?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          nombre?: string;
          icono?: string | null;
          color?: string | null;
        };
      };
      transacciones: {
        Row: {
          id: string;
          usuario_id: string;
          cuenta_id: string;
          categoria_id: string | null;
          gasto_cuota_id: string | null;
          gasto_fijo_id: string | null;
          gasto_fijo_periodo: string | null;
          ingreso_futuro_id: string | null;
          monto: number;
          tipo: TransaccionTipo;
          moneda: MonedaTipo;
          descripcion: string | null;
          fecha: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          cuenta_id: string;
          categoria_id?: string | null;
          gasto_cuota_id?: string | null;
          gasto_fijo_id?: string | null;
          gasto_fijo_periodo?: string | null;
          ingreso_futuro_id?: string | null;
          monto: number;
          tipo: TransaccionTipo;
          moneda: MonedaTipo;
          descripcion?: string | null;
          fecha: string;
          created_at?: string;
        };
        Update: {
          cuenta_id?: string;
          categoria_id?: string | null;
          gasto_cuota_id?: string | null;
          gasto_fijo_id?: string | null;
          gasto_fijo_periodo?: string | null;
          ingreso_futuro_id?: string | null;
          monto?: number;
          tipo?: TransaccionTipo;
          moneda?: MonedaTipo;
          descripcion?: string | null;
          fecha?: string;
        };
      };
      ingresos_futuros: {
        Row: {
          id: string;
          usuario_id: string;
          cuenta_id: string;
          monto: number;
          moneda: MonedaTipo;
          descripcion: string | null;
          fecha_esperada: string | null;
          cobrado_at: string | null;
          transaccion_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          cuenta_id: string;
          monto: number;
          moneda: MonedaTipo;
          descripcion?: string | null;
          fecha_esperada?: string | null;
          cobrado_at?: string | null;
          transaccion_id?: string | null;
          created_at?: string;
        };
        Update: {
          cuenta_id?: string;
          monto?: number;
          moneda?: MonedaTipo;
          descripcion?: string | null;
          fecha_esperada?: string | null;
          cobrado_at?: string | null;
          transaccion_id?: string | null;
        };
      };
      gastos_fijos: {
        Row: {
          id: string;
          usuario_id: string;
          cuenta_id: string;
          categoria_id: string | null;
          descripcion: string;
          monto: number;
          moneda: MonedaTipo;
          dia_mes: number;
          fecha_inicio: string;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          cuenta_id: string;
          categoria_id?: string | null;
          descripcion: string;
          monto: number;
          moneda: MonedaTipo;
          dia_mes: number;
          fecha_inicio: string;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          cuenta_id?: string;
          categoria_id?: string | null;
          descripcion?: string;
          monto?: number;
          moneda?: MonedaTipo;
          dia_mes?: number;
          fecha_inicio?: string;
          activo?: boolean;
          updated_at?: string;
        };
      };
      gastos_cuotas: {
        Row: {
          id: string;
          usuario_id: string;
          cuenta_id: string;
          categoria_id: string | null;
          descripcion: string;
          monto_cuota: number;
          cantidad_cuotas: number;
          cuotas_pagadas: number;
          fecha_primera_cuota: string;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          cuenta_id: string;
          categoria_id?: string | null;
          descripcion: string;
          monto_cuota: number;
          cantidad_cuotas: number;
          cuotas_pagadas?: number;
          fecha_primera_cuota: string;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          cuenta_id?: string;
          categoria_id?: string | null;
          descripcion?: string;
          monto_cuota?: number;
          cantidad_cuotas?: number;
          cuotas_pagadas?: number;
          fecha_primera_cuota?: string;
          activo?: boolean;
          updated_at?: string;
        };
      };
      inversiones: {
        Row: {
          id: string;
          usuario_id: string;
          cuenta_id: string | null;
          nombre_activo: string;
          cantidad: number;
          precio_compra: number;
          precio_actual: number | null;
          tasa_anual: number | null;
          fecha_vencimiento: string | null;
          vendida_at: string | null;
          fecha_venta: string | null;
          precio_venta: number | null;
          moneda: MonedaTipo;
          tipo_activo: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          cuenta_id?: string | null;
          nombre_activo: string;
          cantidad: number;
          precio_compra: number;
          precio_actual?: number | null;
          tasa_anual?: number | null;
          fecha_vencimiento?: string | null;
          vendida_at?: string | null;
          fecha_venta?: string | null;
          precio_venta?: number | null;
          moneda: MonedaTipo;
          tipo_activo: string;
          created_at?: string;
        };
        Update: {
          cuenta_id?: string | null;
          nombre_activo?: string;
          cantidad?: number;
          precio_compra?: number;
          precio_actual?: number | null;
          tasa_anual?: number | null;
          fecha_vencimiento?: string | null;
          vendida_at?: string | null;
          fecha_venta?: string | null;
          precio_venta?: number | null;
          moneda?: MonedaTipo;
          tipo_activo?: string;
        };
      };
      inversiones_movimientos: {
        Row: {
          id: string;
          usuario_id: string;
          inversion_id: string;
          fecha: string;
          cantidad: number;
          precio_unitario: number;
          monto_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          inversion_id: string;
          fecha?: string;
          cantidad: number;
          precio_unitario: number;
          monto_total: number;
          created_at?: string;
        };
        Update: {
          fecha?: string;
          cantidad?: number;
          precio_unitario?: number;
          monto_total?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      moneda_tipo: MonedaTipo;
      transaccion_tipo: TransaccionTipo;
    };
  };
}
