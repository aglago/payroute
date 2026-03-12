/**
 * Database Types for Supabase
 * Based on the migrations in supabase/migrations/
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      webhook_logs: {
        Row: {
          id: string
          source: string
          endpoint: string
          method: string | null
          headers: Json | null
          payload: Json
          destination_app: string | null
          destination_url: string | null
          routing_strategy: string | null
          reference: string | null
          forward_status: string | null
          forward_response_status: number | null
          forward_response_body: Json | null
          forward_duration_ms: number | null
          processing_time_ms: number | null
          ip_address: string | null
          error_message: string | null
          trace_logs: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          source: string
          endpoint: string
          method?: string | null
          headers?: Json | null
          payload: Json
          destination_app?: string | null
          destination_url?: string | null
          routing_strategy?: string | null
          reference?: string | null
          forward_status?: string | null
          forward_response_status?: number | null
          forward_response_body?: Json | null
          forward_duration_ms?: number | null
          processing_time_ms?: number | null
          ip_address?: string | null
          error_message?: string | null
          trace_logs?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          source?: string
          endpoint?: string
          method?: string | null
          headers?: Json | null
          payload?: Json
          destination_app?: string | null
          destination_url?: string | null
          routing_strategy?: string | null
          reference?: string | null
          forward_status?: string | null
          forward_response_status?: number | null
          forward_response_body?: Json | null
          forward_duration_ms?: number | null
          processing_time_ms?: number | null
          ip_address?: string | null
          error_message?: string | null
          trace_logs?: Json | null
          created_at?: string
        }
      }
      dead_letter_webhooks: {
        Row: {
          id: string
          payload: Json
          reference: string | null
          reason: string
          ip_address: string | null
          headers: Json | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          resolution: string | null
          resolution_notes: string | null
          forwarded_to: string | null
          forwarded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payload: Json
          reference?: string | null
          reason: string
          ip_address?: string | null
          headers?: Json | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          resolution?: string | null
          resolution_notes?: string | null
          forwarded_to?: string | null
          forwarded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payload?: Json
          reference?: string | null
          reason?: string
          ip_address?: string | null
          headers?: Json | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          resolution?: string | null
          resolution_notes?: string | null
          forwarded_to?: string | null
          forwarded_at?: string | null
          created_at?: string
        }
      }
      app_configs: {
        Row: {
          id: string
          app_id: string
          name: string
          webhook_url: string
          router_secret: string
          prefixes: string[]
          enabled: boolean
          description: string | null
          icon: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          app_id: string
          name: string
          webhook_url: string
          router_secret: string
          prefixes?: string[]
          enabled?: boolean
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          app_id?: string
          name?: string
          webhook_url?: string
          router_secret?: string
          prefixes?: string[]
          enabled?: boolean
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
