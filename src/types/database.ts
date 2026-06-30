export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      budget_categories: {
        Row: {
          created_at: string
          currency: string
          entry_type_hint: string
          group_key: string
          id: string
          name: string
          org_id: string
          sort_order: number
          user_id: string
          wealth_account_id: string | null
        }
        Insert: {
          created_at?: string
          currency: string
          entry_type_hint: string
          group_key: string
          id?: string
          name: string
          org_id?: string
          sort_order?: number
          user_id: string
          wealth_account_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          entry_type_hint?: string
          group_key?: string
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          user_id?: string
          wealth_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_wealth_account_id_fkey"
            columns: ["wealth_account_id"]
            isOneToOne: false
            referencedRelation: "wealth_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_currencies: {
        Row: {
          created_at: string
          currency: string
          id: string
          org_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          org_id?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          org_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_currencies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_entries: {
        Row: {
          amount: number
          card_account_id: string | null
          category_id: string
          created_at: string
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          notes: string | null
          org_id: string
          period_id: string
          updated_at: string
          user_id: string
          wealth_account_id: string | null
        }
        Insert: {
          amount: number
          card_account_id?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_type: string
          id?: string
          notes?: string | null
          org_id?: string
          period_id: string
          updated_at?: string
          user_id: string
          wealth_account_id?: string | null
        }
        Update: {
          amount?: number
          card_account_id?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          org_id?: string
          period_id?: string
          updated_at?: string
          user_id?: string
          wealth_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_entries_card_account_id_fkey"
            columns: ["card_account_id"]
            isOneToOne: false
            referencedRelation: "card_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "budget_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_wealth_account_id_fkey"
            columns: ["wealth_account_id"]
            isOneToOne: false
            referencedRelation: "wealth_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_periods: {
        Row: {
          created_at: string
          currency: string
          id: string
          notes: string | null
          org_id: string
          period_month: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          notes?: string | null
          org_id?: string
          period_month: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          org_id?: string
          period_month?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_periods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_targets: {
        Row: {
          amount_limit: number
          category_id: string
          created_at: string
          id: string
          period_id: string
          updated_at: string
        }
        Insert: {
          amount_limit?: number
          category_id: string
          created_at?: string
          id?: string
          period_id: string
          updated_at?: string
        }
        Update: {
          amount_limit?: number
          category_id?: string
          created_at?: string
          id?: string
          period_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_targets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_targets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "budget_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      card_accounts: {
        Row: {
          card_kind: string
          created_at: string
          credit_limit: number | null
          currency: string
          id: string
          is_active: boolean
          issuer: string | null
          last_four: string | null
          name: string
          notes: string | null
          org_id: string
          outstanding_balance: number
          region: string | null
          statement_day: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_kind: string
          created_at?: string
          credit_limit?: number | null
          currency: string
          id?: string
          is_active?: boolean
          issuer?: string | null
          last_four?: string | null
          name: string
          notes?: string | null
          org_id?: string
          outstanding_balance?: number
          region?: string | null
          statement_day?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_kind?: string
          created_at?: string
          credit_limit?: number | null
          currency?: string
          id?: string
          is_active?: boolean
          issuer?: string | null
          last_four?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          outstanding_balance?: number
          region?: string | null
          statement_day?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      card_currencies: {
        Row: {
          created_at: string
          currency: string
          id: string
          org_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          org_id?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          org_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_currencies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      card_statements: {
        Row: {
          card_account_id: string
          created_at: string
          id: string
          min_payment: number | null
          notes: string | null
          org_id: string
          payment_due_date: string | null
          period_end: string
          period_start: string
          statement_balance: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_account_id: string
          created_at?: string
          id?: string
          min_payment?: number | null
          notes?: string | null
          org_id?: string
          payment_due_date?: string | null
          period_end: string
          period_start: string
          statement_balance?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_account_id?: string
          created_at?: string
          id?: string
          min_payment?: number | null
          notes?: string | null
          org_id?: string
          payment_due_date?: string | null
          period_end?: string
          period_start?: string
          statement_balance?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_statements_card_account_id_fkey"
            columns: ["card_account_id"]
            isOneToOne: false
            referencedRelation: "card_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_statements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      card_transactions: {
        Row: {
          amount: number
          budget_category_id: string | null
          budget_entry_id: string | null
          card_account_id: string
          created_at: string
          description: string | null
          id: string
          merchant: string | null
          notes: string | null
          org_id: string
          statement_id: string | null
          txn_date: string
          txn_type: string
          user_id: string
        }
        Insert: {
          amount: number
          budget_category_id?: string | null
          budget_entry_id?: string | null
          card_account_id: string
          created_at?: string
          description?: string | null
          id?: string
          merchant?: string | null
          notes?: string | null
          org_id?: string
          statement_id?: string | null
          txn_date?: string
          txn_type: string
          user_id: string
        }
        Update: {
          amount?: number
          budget_category_id?: string | null
          budget_entry_id?: string | null
          card_account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          merchant?: string | null
          notes?: string | null
          org_id?: string
          statement_id?: string | null
          txn_date?: string
          txn_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_transactions_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_budget_entry_id_fkey"
            columns: ["budget_entry_id"]
            isOneToOne: false
            referencedRelation: "budget_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_card_account_id_fkey"
            columns: ["card_account_id"]
            isOneToOne: false
            referencedRelation: "card_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "card_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_source_loan_type_defaults: {
        Row: {
          credit_source_id: string
          due_day: number | null
          id: string
          installments: number | null
          interest_rate: number | null
          loan_type: string
          org_id: string
        }
        Insert: {
          credit_source_id: string
          due_day?: number | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          loan_type: string
          org_id?: string
        }
        Update: {
          credit_source_id?: string
          due_day?: number | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          loan_type?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_source_loan_type_defaults_credit_source_id_fkey"
            columns: ["credit_source_id"]
            isOneToOne: false
            referencedRelation: "credit_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_source_loan_type_defaults_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_sources: {
        Row: {
          created_at: string
          default_due_day: number | null
          default_installments: number | null
          default_interest_rate: number | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          region: string
          type: Database["public"]["Enums"]["credit_source_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_due_day?: number | null
          default_installments?: number | null
          default_interest_rate?: number | null
          id?: string
          is_active?: boolean
          name: string
          org_id?: string
          region: string
          type: Database["public"]["Enums"]["credit_source_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_due_day?: number | null
          default_installments?: number | null
          default_interest_rate?: number | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          region?: string
          type?: Database["public"]["Enums"]["credit_source_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_items: {
        Row: {
          amount: number
          borrower_owes: number
          created_at: string
          description: string
          entry_date: string
          id: string
          is_already_split: boolean
          period_id: string
        }
        Insert: {
          amount: number
          borrower_owes: number
          created_at?: string
          description: string
          entry_date?: string
          id?: string
          is_already_split?: boolean
          period_id: string
        }
        Update: {
          amount?: number
          borrower_owes?: number
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          is_already_split?: boolean
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "expense_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          period_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          period_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "expense_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_periods: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          is_locked: boolean
          period: string
          tab_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_locked?: boolean
          period: string
          tab_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_locked?: boolean
          period?: string
          tab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_periods_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "expense_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_tabs: {
        Row: {
          borrower_id: string
          created_at: string
          currency: string
          id: string
          org_id: string
          region: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          borrower_id: string
          created_at?: string
          currency: string
          id?: string
          org_id?: string
          region: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          borrower_id?: string
          created_at?: string
          currency?: string
          id?: string
          org_id?: string
          region?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_tabs_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_tabs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_no: number
          loan_id: string
          paid_at: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_no: number
          loan_id: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_no?: number
          loan_id?: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          borrower_id: string
          created_at: string
          currency: string
          due_day_of_month: number | null
          ended_at: string | null
          first_due_strategy: string
          id: string
          installments_total: number
          interest_rate: number | null
          loan_type: Database["public"]["Enums"]["loan_type"]
          notes: string | null
          org_id: string
          principal: number
          region: string
          service_fee: number
          source_id: string
          started_at: string
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
        }
        Insert: {
          borrower_id: string
          created_at?: string
          currency: string
          due_day_of_month?: number | null
          ended_at?: string | null
          first_due_strategy?: string
          id?: string
          installments_total: number
          interest_rate?: number | null
          loan_type?: Database["public"]["Enums"]["loan_type"]
          notes?: string | null
          org_id?: string
          principal: number
          region: string
          service_fee?: number
          source_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Update: {
          borrower_id?: string
          created_at?: string
          currency?: string
          due_day_of_month?: number | null
          ended_at?: string | null
          first_due_strategy?: string
          id?: string
          installments_total?: number
          interest_rate?: number | null
          loan_type?: Database["public"]["Enums"]["loan_type"]
          notes?: string | null
          org_id?: string
          principal?: number
          region?: string
          service_fee?: number
          source_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "credit_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          org_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          org_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          org_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active_regions: string[] | null
          created_at: string
          id: string
          name: string
          plan: string
          region: string
          slug: string
          updated_at: string
        }
        Insert: {
          active_regions?: string[] | null
          created_at?: string
          id?: string
          name: string
          plan?: string
          region?: string
          slug: string
          updated_at?: string
        }
        Update: {
          active_regions?: string[] | null
          created_at?: string
          id?: string
          name?: string
          plan?: string
          region?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          admin_note: string | null
          created_at: string
          file_url: string | null
          id: string
          installment_id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["proof_status"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          installment_id: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["proof_status"]
          submitted_by: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          installment_id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["proof_status"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          region: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          region?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          region?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      user_org_context: {
        Row: {
          org_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          org_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          org_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_org_context_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_accounts: {
        Row: {
          account_kind: string
          cash_balance: number
          created_at: string
          currency: string
          id: string
          institution: string | null
          market_value: number | null
          name: string
          notes: string | null
          org_id: string
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_kind: string
          cash_balance?: number
          created_at?: string
          currency: string
          id?: string
          institution?: string | null
          market_value?: number | null
          name: string
          notes?: string | null
          org_id?: string
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_kind?: string
          cash_balance?: number
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          market_value?: number | null
          name?: string
          notes?: string | null
          org_id?: string
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_transactions: {
        Row: {
          account_id: string
          amount: number
          budget_entry_id: string | null
          created_at: string
          id: string
          notes: string | null
          org_id: string
          txn_date: string
          txn_type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          budget_entry_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          txn_date?: string
          txn_type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          budget_entry_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          txn_date?: string
          txn_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "wealth_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_transactions_budget_entry_id_fkey"
            columns: ["budget_entry_id"]
            isOneToOne: false
            referencedRelation: "budget_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      get_user_confirmation_statuses: {
        Args: never
        Returns: {
          id: string
          is_confirmed: boolean
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      my_org_id: { Args: never; Returns: string }
      my_profile_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      credit_source_type: "e_wallet" | "credit_card" | "bnpl" | "bank_transfer"
      loan_status: "active" | "completed" | "defaulted" | "cancelled"
      loan_type:
        | "tabby"
        | "sloan"
        | "gloan"
        | "spaylater"
        | "credit_card"
        | "custom"
        | "lazcredit"
        | "maribank_credit"
        | "cashnow"
      payment_status: "unpaid" | "pending" | "paid"
      proof_status: "pending" | "approved" | "rejected"
      user_role: "admin" | "borrower"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      credit_source_type: ["e_wallet", "credit_card", "bnpl", "bank_transfer"],
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
        "cashnow",
      ],
      payment_status: ["unpaid", "pending", "paid"],
      proof_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "borrower"],
    },
  },
} as const
