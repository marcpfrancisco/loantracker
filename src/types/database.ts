// Manually maintained — mirrors Supabase schema in migrations/001_initial_schema.sql
// To regenerate automatically: npx supabase gen types typescript --project-id <id> > src/types/database.ts

// ── Enum types ────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "borrower";
export type RegionType = "PH" | "UAE";
export type CurrencyType = "PHP" | "AED";
export type LoanStatus = "active" | "completed" | "defaulted" | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid";
export type CreditSourceType = "e_wallet" | "credit_card" | "bnpl" | "bank_transfer";
export type LoanType = "tabby" | "sloan" | "gloan" | "spaylater" | "credit_card" | "custom";
export type ProofStatus = "pending" | "approved" | "rejected";

// ── Database interface (matches supabase-js GenericSchema shape exactly) ──────
// The Relationships array is required by supabase-js v2 type machinery.
// Without it, partial .select() calls infer `never` instead of the row type.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          region: RegionType;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole;
          region?: RegionType;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          region?: RegionType;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_sources: {
        Row: {
          id: string;
          name: string;
          type: CreditSourceType;
          region: RegionType;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: CreditSourceType;
          region: RegionType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: CreditSourceType;
          region?: RegionType;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      loans: {
        Row: {
          id: string;
          borrower_id: string;
          source_id: string;
          loan_type: LoanType;
          currency: CurrencyType;
          principal: number;
          interest_rate: number | null;
          service_fee: number;
          installments_total: number;
          due_day_of_month: number | null;
          status: LoanStatus;
          region: RegionType;
          notes: string | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          borrower_id: string;
          source_id: string;
          loan_type?: LoanType;
          currency: CurrencyType;
          principal: number;
          interest_rate?: number | null;
          service_fee?: number;
          installments_total: number;
          due_day_of_month?: number | null;
          status?: LoanStatus;
          region: RegionType;
          notes?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          borrower_id?: string;
          source_id?: string;
          loan_type?: LoanType;
          currency?: CurrencyType;
          principal?: number;
          interest_rate?: number | null;
          service_fee?: number;
          installments_total?: number;
          due_day_of_month?: number | null;
          status?: LoanStatus;
          region?: RegionType;
          notes?: string | null;
          started_at?: string;
          ended_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loans_borrower_id_fkey";
            columns: ["borrower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "credit_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      installments: {
        Row: {
          id: string;
          loan_id: string;
          installment_no: number;
          due_date: string;
          amount: number;
          status: PaymentStatus;
          receipt_url: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          loan_id: string;
          installment_no: number;
          due_date: string;
          amount: number;
          status?: PaymentStatus;
          receipt_url?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          loan_id?: string;
          installment_no?: number;
          due_date?: string;
          amount?: number;
          status?: PaymentStatus;
          receipt_url?: string | null;
          paid_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "installments_loan_id_fkey";
            columns: ["loan_id"];
            isOneToOne: false;
            referencedRelation: "loans";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_proofs: {
        Row: {
          id: string;
          installment_id: string;
          submitted_by: string;
          file_url: string;
          status: ProofStatus;
          admin_note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          installment_id: string;
          submitted_by: string;
          file_url: string;
          status?: ProofStatus;
          admin_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          installment_id?: string;
          submitted_by?: string;
          file_url?: string;
          status?: ProofStatus;
          admin_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_proofs_installment_id_fkey";
            columns: ["installment_id"];
            isOneToOne: false;
            referencedRelation: "installments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_proofs_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      user_role: UserRole;
      region_type: RegionType;
      currency_type: CurrencyType;
      loan_status: LoanStatus;
      payment_status: PaymentStatus;
      credit_source_type: CreditSourceType;
      loan_type: LoanType;
      proof_status: ProofStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}

// ── Convenience helpers ───────────────────────────────────────────────────────
// Mirror the shape that `supabase gen types` produces.

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
