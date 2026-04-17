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
          monto?: number;
          tipo?: TransaccionTipo;
          moneda?: MonedaTipo;
          descripcion?: string | null;
          fecha?: string;
        };
      };
      inversiones: {
        Row: {
          id: string;
          usuario_id: string;
          nombre_activo: string;
          cantidad: number;
          precio_compra: number;
          precio_actual: number | null;
          moneda: MonedaTipo;
          tipo_activo: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          nombre_activo: string;
          cantidad: number;
          precio_compra: number;
          precio_actual?: number | null;
          moneda: MonedaTipo;
          tipo_activo: string;
          created_at?: string;
        };
        Update: {
          nombre_activo?: string;
          cantidad?: number;
          precio_compra?: number;
          precio_actual?: number | null;
          moneda?: MonedaTipo;
          tipo_activo?: string;
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
