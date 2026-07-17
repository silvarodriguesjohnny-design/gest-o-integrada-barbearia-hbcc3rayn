// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_name: string | null
          created_at: string
          customer_id: string
          end_time: string
          id: string
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string | null
        }
        Insert: {
          barber_name?: string | null
          created_at?: string
          customer_id: string
          end_time: string
          id?: string
          service_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string | null
        }
        Update: {
          barber_name?: string | null
          created_at?: string
          customer_id?: string
          end_time?: string
          id?: string
          service_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          auto_trigger: boolean
          created_at: string
          discount_percentage: number | null
          end_date: string | null
          id: string
          is_active: boolean
          message_template: string | null
          start_date: string | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          auto_trigger?: boolean
          created_at?: string
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          message_template?: string | null
          start_date?: string | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          auto_trigger?: boolean
          created_at?: string
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          message_template?: string | null
          start_date?: string | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          birthday: string | null
          created_at: string
          email: string | null
          id: string
          last_visit_at: string | null
          name: string
          phone: string | null
          tenant_id: string | null
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_visit_at?: string | null
          name: string
          phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_visit_at?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      loyalty_cards: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_reward_ready: boolean
          stamps_count: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_reward_ready?: boolean
          stamps_count?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_reward_ready?: boolean
          stamps_count?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_super_admin: boolean
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_super_admin?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_super_admin?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price: number
          tenant_id: string | null
        }
        Insert: {
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          tenant_id?: string | null
        }
        Update: {
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          tenant_id?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          subscription_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          subscription_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          subscription_status?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          payment_method: string | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          tenant_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inactive_customers: {
        Row: {
          birthday: string | null
          created_at: string | null
          email: string | null
          id: string | null
          last_visit_at: string | null
          name: string | null
          phone: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      appointment_status: "scheduled" | "confirmed" | "completed" | "cancelled"
      plan_type: "essential" | "pro" | "elite"
      transaction_type: "income" | "expense"
      user_role: "admin" | "operator" | "viewer"
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
  public: {
    Enums: {
      appointment_status: ["scheduled", "confirmed", "completed", "cancelled"],
      plan_type: ["essential", "pro", "elite"],
      transaction_type: ["income", "expense"],
      user_role: ["admin", "operator", "viewer"],
    },
  },
} as const

