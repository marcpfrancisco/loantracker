// Auto-generated from Supabase schema. Keep in sync with migrations/001_initial_schema.sql
// To regenerate: npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts

export type UserRole = "admin" | "borrower";
export type RegionType = "PH" | "UAE";
export type CurrencyType = "PHP" | "AED";
export type LoanStatus = "active" | "completed" | "defaulted" | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid";
export type CreditSourceType = "e_wallet" | "credit_card" | "bnpl" | "bank_transfer";
export type LoanType = "tabby" | "sloan" | "gloan" | "spaylater" | "credit_card" | "custom";
export type ProofStatus = "pending" | "approved" | "rejected";

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
      };
    };
  };
}

// Convenience helper — mirrors Supabase's generated Tables<T> utility
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
