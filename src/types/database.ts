export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      credit_sources: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          region: Database["public"]["Enums"]["region_type"];
          type: Database["public"]["Enums"]["credit_source_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          region: Database["public"]["Enums"]["region_type"];
          type: Database["public"]["Enums"]["credit_source_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          region?: Database["public"]["Enums"]["region_type"];
          type?: Database["public"]["Enums"]["credit_source_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      expense_items: {
        Row: {
          amount: number;
          borrower_owes: number;
          created_at: string;
          description: string;
          entry_date: string;
          id: string;
          is_already_split: boolean;
          period_id: string;
        };
        Insert: {
          amount: number;
          borrower_owes: number;
          created_at?: string;
          description: string;
          entry_date?: string;
          id?: string;
          is_already_split?: boolean;
          period_id: string;
        };
        Update: {
          amount?: number;
          borrower_owes?: number;
          created_at?: string;
          description?: string;
          entry_date?: string;
          id?: string;
          is_already_split?: boolean;
          period_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_items_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "expense_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          notes: string | null;
          payment_date: string;
          period_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date?: string;
          period_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date?: string;
          period_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_payments_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "expense_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_periods: {
        Row: {
          created_at: string;
          id: string;
          is_archived: boolean;
          is_locked: boolean;
          period: string;
          tab_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          is_locked?: boolean;
          period: string;
          tab_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          is_locked?: boolean;
          period?: string;
          tab_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_periods_tab_id_fkey";
            columns: ["tab_id"];
            isOneToOne: false;
            referencedRelation: "expense_tabs";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_tabs: {
        Row: {
          borrower_id: string;
          created_at: string;
          currency: Database["public"]["Enums"]["currency_type"];
          id: string;
          region: Database["public"]["Enums"]["region_type"];
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          borrower_id: string;
          created_at?: string;
          currency: Database["public"]["Enums"]["currency_type"];
          id?: string;
          region: Database["public"]["Enums"]["region_type"];
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          borrower_id?: string;
          created_at?: string;
          currency?: Database["public"]["Enums"]["currency_type"];
          id?: string;
          region?: Database["public"]["Enums"]["region_type"];
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_tabs_borrower_id_fkey";
            columns: ["borrower_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      installments: {
        Row: {
          amount: number;
          created_at: string;
          due_date: string;
          id: string;
          installment_no: number;
          loan_id: string;
          paid_at: string | null;
          receipt_url: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          due_date: string;
          id?: string;
          installment_no: number;
          loan_id: string;
          paid_at?: string | null;
          receipt_url?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          due_date?: string;
          id?: string;
          installment_no?: number;
          loan_id?: string;
          paid_at?: string | null;
          receipt_url?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
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
      loans: {
        Row: {
          borrower_id: string;
          created_at: string;
          currency: Database["public"]["Enums"]["currency_type"];
          due_day_of_month: number | null;
          ended_at: string | null;
          id: string;
          installments_total: number;
          interest_rate: number | null;
          loan_type: Database["public"]["Enums"]["loan_type"];
          notes: string | null;
          principal: number;
          region: Database["public"]["Enums"]["region_type"];
          service_fee: number;
          source_id: string;
          started_at: string;
          status: Database["public"]["Enums"]["loan_status"];
          updated_at: string;
        };
        Insert: {
          borrower_id: string;
          created_at?: string;
          currency: Database["public"]["Enums"]["currency_type"];
          due_day_of_month?: number | null;
          ended_at?: string | null;
          id?: string;
          installments_total: number;
          interest_rate?: number | null;
          loan_type?: Database["public"]["Enums"]["loan_type"];
          notes?: string | null;
          principal: number;
          region: Database["public"]["Enums"]["region_type"];
          service_fee?: number;
          source_id: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["loan_status"];
          updated_at?: string;
        };
        Update: {
          borrower_id?: string;
          created_at?: string;
          currency?: Database["public"]["Enums"]["currency_type"];
          due_day_of_month?: number | null;
          ended_at?: string | null;
          id?: string;
          installments_total?: number;
          interest_rate?: number | null;
          loan_type?: Database["public"]["Enums"]["loan_type"];
          notes?: string | null;
          principal?: number;
          region?: Database["public"]["Enums"]["region_type"];
          service_fee?: number;
          source_id?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["loan_status"];
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
      notifications: {
        Row: {
          body: string;
          created_at: string;
          data: Json;
          id: string;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          data?: Json;
          id?: string;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payment_proofs: {
        Row: {
          admin_note: string | null;
          created_at: string;
          file_url: string | null;
          id: string;
          installment_id: string;
          note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["proof_status"];
          submitted_by: string;
          updated_at: string;
        };
        Insert: {
          admin_note?: string | null;
          created_at?: string;
          file_url?: string | null;
          id?: string;
          installment_id: string;
          note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["proof_status"];
          submitted_by: string;
          updated_at?: string;
        };
        Update: {
          admin_note?: string | null;
          created_at?: string;
          file_url?: string | null;
          id?: string;
          installment_id?: string;
          note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["proof_status"];
          submitted_by?: string;
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
            foreignKeyName: "payment_proofs_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          region: Database["public"]["Enums"]["region_type"];
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          region?: Database["public"]["Enums"]["region_type"];
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          region?: Database["public"]["Enums"]["region_type"];
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_notification: {
        Args: {
          p_body: string;
          p_data?: Json;
          p_title: string;
          p_type: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      get_user_confirmation_statuses: {
        Args: never;
        Returns: {
          id: string;
          is_confirmed: boolean;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      credit_source_type: "e_wallet" | "credit_card" | "bnpl" | "bank_transfer";
      currency_type: "PHP" | "AED";
      loan_status: "active" | "completed" | "defaulted" | "cancelled";
      loan_type:
        | "tabby"
        | "sloan"
        | "gloan"
        | "spaylater"
        | "credit_card"
        | "custom"
        | "lazcredit"
        | "maribank_credit";
      payment_status: "unpaid" | "pending" | "paid";
      proof_status: "pending" | "approved" | "rejected";
      region_type: "PH" | "UAE";
      user_role: "admin" | "borrower";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      credit_source_type: ["e_wallet", "credit_card", "bnpl", "bank_transfer"],
      currency_type: ["PHP", "AED"],
      loan_status: ["active", "completed", "defaulted", "cancelled"],
      loan_type: [
        "tabby",
        "sloan",
        "gloan",
        "spaylater",
        "credit_card",
        "custom",
        "lazcredit",
        "maribank_credit",
      ],
      payment_status: ["unpaid", "pending", "paid"],
      proof_status: ["pending", "approved", "rejected"],
      region_type: ["PH", "UAE"],
      user_role: ["admin", "borrower"],
    },
  },
} as const;
