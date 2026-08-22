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
          barber_id: string | null
          barber_name: string | null
          confirmation_token: string | null
          created_at: string
          customer_id: string
          end_time: string
          id: string
          reminder_sent: boolean | null
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string | null
        }
        Insert: {
          barber_id?: string | null
          barber_name?: string | null
          confirmation_token?: string | null
          created_at?: string
          customer_id: string
          end_time: string
          id?: string
          reminder_sent?: boolean | null
          service_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string | null
        }
        Update: {
          barber_id?: string | null
          barber_name?: string | null
          confirmation_token?: string | null
          created_at?: string
          customer_id?: string
          end_time?: string
          id?: string
          reminder_sent?: boolean | null
          service_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_schedules: {
        Row: {
          barber_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          tenant_id: string | null
        }
        Insert: {
          barber_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          tenant_id?: string | null
        }
        Update: {
          barber_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_schedules_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          public_token: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          public_token?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          public_token?: string | null
          tenant_id?: string | null
        }
        Relationships: []
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
      customer_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          id: string
          plan_id: string | null
          sessions_limit: number | null
          sessions_used: number | null
          status: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          id?: string
          plan_id?: string | null
          sessions_limit?: number | null
          sessions_used?: number | null
          status?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          id?: string
          plan_id?: string | null
          sessions_limit?: number | null
          sessions_used?: number | null
          status?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          communication_preferences: Json | null
          cpf: string | null
          created_at: string
          discount_percentage: number | null
          email: string | null
          id: string
          last_visit_at: string | null
          name: string
          phone: string | null
          tenant_id: string | null
        }
        Insert: {
          birthday?: string | null
          communication_preferences?: Json | null
          cpf?: string | null
          created_at?: string
          discount_percentage?: number | null
          email?: string | null
          id?: string
          last_visit_at?: string | null
          name: string
          phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          birthday?: string | null
          communication_preferences?: Json | null
          cpf?: string | null
          created_at?: string
          discount_percentage?: number | null
          email?: string | null
          id?: string
          last_visit_at?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body: string | null
          created_at: string
          id: string
          recipient: string
          status: string
          subject: string
          tenant_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          recipient: string
          status?: string
          subject: string
          tenant_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          recipient?: string
          status?: string
          subject?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      inactivity_alerts: {
        Row: {
          active: boolean
          channels: Json
          created_at: string
          days: number
          id: string
          message: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          channels?: Json
          created_at?: string
          days?: number
          id?: string
          message: string
          tenant_id: string
        }
        Update: {
          active?: boolean
          channels?: Json
          created_at?: string
          days?: number
          id?: string
          message?: string
          tenant_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          tenant_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          tenant_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
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
      messaging_configs: {
        Row: {
          channel: string
          config_json: Json
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
        }
        Insert: {
          channel: string
          config_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
        }
        Update: {
          channel?: string
          config_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          appointment_id: string | null
          body: string | null
          channel: string
          created_at: string
          id: string
          notification_type: string | null
          sent_at: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          channel: string
          created_at?: string
          id?: string
          notification_type?: string | null
          sent_at?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          notification_type?: string | null
          sent_at?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          discount_percentage: number
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percentage?: number
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percentage?: number
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      pending_tenants: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string
          estado: string | null
          full_name: string
          horario_funcionamento: string | null
          id: string
          nome_negocio: string
          numero: string | null
          numero_cadeiras: number | null
          phone: string | null
          quantidade_profissionais: number | null
          rua: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email: string
          estado?: string | null
          full_name: string
          horario_funcionamento?: string | null
          id?: string
          nome_negocio: string
          numero?: string | null
          numero_cadeiras?: number | null
          phone?: string | null
          quantidade_profissionais?: number | null
          rua?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string
          estado?: string | null
          full_name?: string
          horario_funcionamento?: string | null
          id?: string
          nome_negocio?: string
          numero?: string | null
          numero_cadeiras?: number | null
          phone?: string | null
          quantidade_profissionais?: number | null
          rua?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      plan_commissions: {
        Row: {
          commission_pct: number
          created_at: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          commission_pct?: number
          created_at?: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          commission_pct?: number
          created_at?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_commissions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_earnings: {
        Row: {
          amount: number
          created_at: string | null
          fee_percent: number | null
          id: string
          source_id: string | null
          source_type: string
          status: string | null
          stripe_charge_id: string | null
          stripe_transfer_id: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          fee_percent?: number | null
          id?: string
          source_id?: string | null
          source_type: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_transfer_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          fee_percent?: number | null
          id?: string
          source_id?: string | null
          source_type?: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_transfer_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_earnings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_secrets: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          min_stock: number
          name: string
          price: number | null
          stock_quantity: number
          tenant_id: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          min_stock?: number
          name: string
          price?: number | null
          stock_quantity?: number
          tenant_id?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          min_stock?: number
          name?: string
          price?: number | null
          stock_quantity?: number
          tenant_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          disabled_at: string | null
          email: string
          full_name: string
          id: string
          is_super_admin: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          disabled_at?: string | null
          email?: string
          full_name?: string
          id: string
          is_super_admin?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          disabled_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_super_admin?: boolean
          phone?: string | null
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
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          product_id: string
          quantity: number
          reason: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          product_id: string
          quantity: number
          reason?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          product_id?: string
          quantity?: number
          reason?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_accounts: {
        Row: {
          charges_enabled: boolean | null
          created_at: string | null
          details_submitted: boolean | null
          id: string
          payouts_enabled: boolean | null
          stripe_account_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          event_id: string | null
          event_type: string
          id: string
          received_at: string
        }
        Insert: {
          event_id?: string | null
          event_type: string
          id?: string
          received_at?: string
        }
        Update: {
          event_id?: string | null
          event_type?: string
          id?: string
          received_at?: string
        }
        Relationships: []
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          prepaid_discount_pct: number
          prepaid_months: number
          prepaid_price: number
          price: number
          services_included: Json
          sessions_limit: number
          stripe_price_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          prepaid_discount_pct?: number
          prepaid_months?: number
          prepaid_price?: number
          price?: number
          services_included?: Json
          sessions_limit?: number
          stripe_price_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          prepaid_discount_pct?: number
          prepaid_months?: number
          prepaid_price?: number
          price?: number
          services_included?: Json
          sessions_limit?: number
          stripe_price_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          customer_subscription_id: string
          id: string
          session_date: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          customer_subscription_id: string
          id?: string
          session_date?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          customer_subscription_id?: string
          id?: string
          session_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_customer_subscription_id_fkey"
            columns: ["customer_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_paid: number
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          payment_type: string
          plan_id: string
          start_date: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          payment_type?: string
          plan_id: string
          start_date?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          payment_type?: string
          plan_id?: string
          start_date?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          commission_pct_override: number | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          estado: string | null
          full_name: string | null
          horario_funcionamento: string | null
          id: string
          logo_url: string | null
          name: string
          numero: string | null
          numero_cadeiras: number | null
          owner_id: string | null
          phone: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          prepayment_enabled: boolean
          quantidade_profissionais: number | null
          rua: string | null
          slug: string
          status: string
          stripe_connect_enabled: boolean
          stripe_connect_id: string | null
          subscription_status: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          commission_pct_override?: number | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          full_name?: string | null
          horario_funcionamento?: string | null
          id?: string
          logo_url?: string | null
          name: string
          numero?: string | null
          numero_cadeiras?: number | null
          owner_id?: string | null
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          prepayment_enabled?: boolean
          quantidade_profissionais?: number | null
          rua?: string | null
          slug: string
          status?: string
          stripe_connect_enabled?: boolean
          stripe_connect_id?: string | null
          subscription_status?: string
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          commission_pct_override?: number | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          full_name?: string | null
          horario_funcionamento?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          numero?: string | null
          numero_cadeiras?: number | null
          owner_id?: string | null
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          prepayment_enabled?: boolean
          quantidade_profissionais?: number | null
          rua?: string | null
          slug?: string
          status?: string
          stripe_connect_enabled?: boolean
          stripe_connect_id?: string | null
          subscription_status?: string
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      totem_config: {
        Row: {
          app_name: string
          background_color: string
          created_at: string
          icon_192_url: string | null
          icon_512_url: string | null
          id: string
          slug: string
          tenant_id: string
          theme_color: string
          updated_at: string
        }
        Insert: {
          app_name: string
          background_color?: string
          created_at?: string
          icon_192_url?: string | null
          icon_512_url?: string | null
          id?: string
          slug: string
          tenant_id: string
          theme_color?: string
          updated_at?: string
        }
        Update: {
          app_name?: string
          background_color?: string
          created_at?: string
          icon_192_url?: string | null
          icon_512_url?: string | null
          id?: string
          slug?: string
          tenant_id?: string
          theme_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "totem_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      consume_subscription_session: {
        Args: {
          p_appointment_id?: string
          p_customer_id: string
          p_tenant_id: string
        }
        Returns: boolean
      }
      get_active_subscription: {
        Args: { p_customer_id: string; p_tenant_id: string }
        Returns: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          id: string
          plan_id: string | null
          sessions_limit: number | null
          sessions_used: number | null
          status: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_subscriptions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_tenant_commission: { Args: { p_tenant_id: string }; Returns: number }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      register_stock_movement: {
        Args: {
          p_movement_type: Database["public"]["Enums"]["stock_movement_type"]
          p_product_id: string
          p_quantity: number
          p_reason?: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          product_id: string
          quantity: number
          reason: string
          tenant_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trigger_send_notifications: { Args: never; Returns: undefined }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "pending_payment"
      plan_type: "essential" | "pro" | "elite"
      stock_movement_type: "entrada" | "saida"
      subscription_type: "trial" | "active" | "past_due"
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
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "pending_payment",
      ],
      plan_type: ["essential", "pro", "elite"],
      stock_movement_type: ["entrada", "saida"],
      subscription_type: ["trial", "active", "past_due"],
      transaction_type: ["income", "expense"],
      user_role: ["admin", "operator", "viewer"],
    },
  },
} as const

