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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_code: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          region_id: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          company_code?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          region_id?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          company_code?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          region_id?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string
          created_at: string | null
          deleted_at: string | null
          equipment_types: string[] | null
          id: string
          manager_id: string | null
          master_code_id: string | null
          max_pickup_hours: number | null
          name: string | null
          pib: string | null
          status: string | null
          waste_types: Json | null
        }
        Insert: {
          code: string
          created_at?: string | null
          deleted_at?: string | null
          equipment_types?: string[] | null
          id?: string
          manager_id?: string | null
          master_code_id?: string | null
          max_pickup_hours?: number | null
          name?: string | null
          pib?: string | null
          status?: string | null
          waste_types?: Json | null
        }
        Update: {
          code?: string
          created_at?: string | null
          deleted_at?: string | null
          equipment_types?: string[] | null
          id?: string
          manager_id?: string | null
          master_code_id?: string | null
          max_pickup_hours?: number | null
          name?: string | null
          pib?: string | null
          status?: string | null
          waste_types?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_master_code_id_fkey"
            columns: ["master_code_id"]
            isOneToOne: false
            referencedRelation: "master_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          client_address: string | null
          client_name: string | null
          company_code: string
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          delivered_at: string | null
          delivery_proof_url: string | null
          driver_id: string
          driver_weight: number | null
          driver_weight_unit: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          picked_up_at: string | null
          pickup_proof_url: string | null
          request_id: string | null
          status: string | null
          updated_at: string | null
          waste_label: string | null
          waste_type: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_address?: string | null
          client_name?: string | null
          company_code: string
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_proof_url?: string | null
          driver_id: string
          driver_weight?: number | null
          driver_weight_unit?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          picked_up_at?: string | null
          pickup_proof_url?: string | null
          request_id?: string | null
          status?: string | null
          updated_at?: string | null
          waste_label?: string | null
          waste_type?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_address?: string | null
          client_name?: string | null
          company_code?: string
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_proof_url?: string | null
          driver_id?: string
          driver_weight?: number | null
          driver_weight_unit?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          picked_up_at?: string | null
          pickup_proof_url?: string | null
          request_id?: string | null
          status?: string | null
          updated_at?: string | null
          waste_label?: string | null
          waste_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_location_history: {
        Row: {
          company_code: string
          driver_id: string
          id: string
          latitude: number
          longitude: number
          recorded_at: string
        }
        Insert: {
          company_code: string
          driver_id: string
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
        }
        Update: {
          company_code?: string
          driver_id?: string
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_location_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          altitude: number | null
          battery_level: number | null
          company_code: string
          created_at: string
          driver_id: string
          heading: number | null
          id: string
          is_charging: boolean | null
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          battery_level?: number | null
          company_code: string
          created_at?: string
          driver_id: string
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          battery_level?: number | null
          company_code?: string
          created_at?: string
          driver_id?: string
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          assigned_to: string | null
          company_code: string
          created_at: string | null
          custom_image_url: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          region_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_code: string
          created_at?: string | null
          custom_image_url?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          region_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_code?: string
          created_at?: string | null
          custom_image_url?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          region_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company"
            columns: ["company_code"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["code"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          company_code: string
          created_at: string | null
          created_by: string | null
          date: string
          driver_id: string | null
          fuel_type: string | null
          gas_station: string | null
          id: string
          liters: number
          notes: string | null
          odometer_km: number | null
          price_per_liter: number | null
          receipt_image_url: string | null
          total_price: number | null
          vehicle_id: string | null
        }
        Insert: {
          company_code: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          driver_id?: string | null
          fuel_type?: string | null
          gas_station?: string | null
          id?: string
          liters: number
          notes?: string | null
          odometer_km?: number | null
          price_per_liter?: number | null
          receipt_image_url?: string | null
          total_price?: number | null
          vehicle_id?: string | null
        }
        Update: {
          company_code?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          driver_id?: string | null
          fuel_type?: string | null
          gas_station?: string | null
          id?: string
          liters?: number
          notes?: string | null
          odometer_km?: number | null
          price_per_liter?: number | null
          receipt_image_url?: string | null
          total_price?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_log: {
        Row: {
          admin_id: string | null
          ended_at: string | null
          id: string
          impersonated_user_id: string | null
          started_at: string | null
        }
        Insert: {
          admin_id?: string | null
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          started_at?: string | null
        }
        Update: {
          admin_id?: string | null
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_log_impersonated_user_id_fkey"
            columns: ["impersonated_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventories: {
        Row: {
          company_code: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          manager_visibility: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_code: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          manager_visibility?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_code?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          manager_visibility?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventories_company"
            columns: ["company_code"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["code"]
          },
        ]
      }
      inventory_items: {
        Row: {
          id: string
          inventory_id: string
          last_updated: string | null
          quantity_kg: number | null
          waste_type_id: string
        }
        Insert: {
          id?: string
          inventory_id: string
          last_updated?: string | null
          quantity_kg?: number | null
          waste_type_id: string
        }
        Update: {
          id?: string
          inventory_id?: string
          last_updated?: string | null
          quantity_kg?: number | null
          waste_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_items_inventory"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_items_waste_type"
            columns: ["waste_type_id"]
            isOneToOne: false
            referencedRelation: "waste_types"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_kalo: {
        Row: {
          company_code: string
          created_at: string | null
          id: string
          inventory_id: string
          outbound_id: string
          quantity_kg: number
          waste_type_id: string
        }
        Insert: {
          company_code: string
          created_at?: string | null
          id?: string
          inventory_id: string
          outbound_id: string
          quantity_kg: number
          waste_type_id: string
        }
        Update: {
          company_code?: string
          created_at?: string | null
          id?: string
          inventory_id?: string
          outbound_id?: string
          quantity_kg?: number
          waste_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_kalo_company"
            columns: ["company_code"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_kalo_inventory"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_kalo_outbound"
            columns: ["outbound_id"]
            isOneToOne: false
            referencedRelation: "inventory_outbound"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_kalo_waste_type"
            columns: ["waste_type_id"]
            isOneToOne: false
            referencedRelation: "waste_types"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_outbound: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          company_code: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string
          id: string
          inventory_id: string
          notes: string | null
          price_per_kg: number | null
          quantity_planned_kg: number
          quantity_received_kg: number | null
          recipient_address: string | null
          recipient_contact: string | null
          recipient_name: string
          region_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          total_amount: number | null
          waste_type_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_code: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          inventory_id: string
          notes?: string | null
          price_per_kg?: number | null
          quantity_planned_kg: number
          quantity_received_kg?: number | null
          recipient_address?: string | null
          recipient_contact?: string | null
          recipient_name: string
          region_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          total_amount?: number | null
          waste_type_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_code?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          price_per_kg?: number | null
          quantity_planned_kg?: number
          quantity_received_kg?: number | null
          recipient_address?: string | null
          recipient_contact?: string | null
          recipient_name?: string
          region_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          total_amount?: number | null
          waste_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_outbound_cancelled_by"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_outbound_company"
            columns: ["company_code"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_outbound_confirmed_by"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_outbound_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_outbound_inventory"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_outbound_sent_by"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_outbound_waste_type"
            columns: ["waste_type_id"]
            isOneToOne: false
            referencedRelation: "waste_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_outbound_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          inventory_id: string
          notes: string | null
          quantity_kg: number
          region_id: string | null
          region_name: string | null
          source_id: string | null
          source_type: string
          transaction_type: string
          waste_type_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          inventory_id: string
          notes?: string | null
          quantity_kg: number
          region_id?: string | null
          region_name?: string | null
          source_id?: string | null
          source_type: string
          transaction_type: string
          waste_type_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity_kg?: number
          region_id?: string | null
          region_name?: string | null
          source_id?: string | null
          source_type?: string
          transaction_type?: string
          waste_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_transactions_inventory"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_transactions_region"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_transactions_user"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_transactions_waste_type"
            columns: ["waste_type_id"]
            isOneToOne: false
            referencedRelation: "waste_types"
            referencedColumns: ["id"]
          },
        ]
      }
      master_codes: {
        Row: {
          billing_type: string | null
          code: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          note: string | null
          pib: string | null
          price: number | null
          status: string | null
          used_by_company: string | null
        }
        Insert: {
          billing_type?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          note?: string | null
          pib?: string | null
          price?: number | null
          status?: string | null
          used_by_company?: string | null
        }
        Update: {
          billing_type?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          note?: string | null
          pib?: string | null
          price?: number | null
          status?: string | null
          used_by_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_codes_used_by_company_fkey"
            columns: ["used_by_company"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          company_code: string
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          company_code: string
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          company_code?: string
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          push_token: string | null
          read_at: string | null
          send_error: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          push_token?: string | null
          read_at?: string | null
          send_error?: string | null
          sent_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          push_token?: string | null
          read_at?: string | null
          send_error?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_requests: {
        Row: {
          client_address: string | null
          client_name: string | null
          client_phone: string | null
          company_code: string | null
          created_at: string | null
          created_by_manager: string | null
          deleted_at: string | null
          fill_level: number | null
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          region_id: string | null
          request_code: string | null
          status: string | null
          urgency: string | null
          user_id: string
          waste_label: string | null
          waste_type: string | null
        }
        Insert: {
          client_address?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_code?: string | null
          created_at?: string | null
          created_by_manager?: string | null
          deleted_at?: string | null
          fill_level?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          region_id?: string | null
          request_code?: string | null
          status?: string | null
          urgency?: string | null
          user_id: string
          waste_label?: string | null
          waste_type?: string | null
        }
        Update: {
          client_address?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_code?: string | null
          created_at?: string | null
          created_by_manager?: string | null
          deleted_at?: string | null
          fill_level?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          region_id?: string | null
          request_code?: string | null
          status?: string | null
          urgency?: string | null
          user_id?: string
          waste_label?: string | null
          waste_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pickup_requests_created_by_manager"
            columns: ["created_by_manager"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_requests: {
        Row: {
          client_address: string | null
          client_hidden_at: string | null
          client_id: string | null
          client_name: string | null
          company_code: string
          created_at: string | null
          deleted_at: string | null
          driver_assignment_id: string | null
          driver_id: string | null
          driver_name: string | null
          fill_level: number | null
          id: string
          note: string | null
          processed_at: string | null
          processed_by_id: string | null
          processed_by_name: string | null
          processing_note: string | null
          proof_image_url: string | null
          region_id: string | null
          request_code: string | null
          request_id: string | null
          status: string | null
          urgency: string | null
          waste_label: string | null
          waste_type: string | null
          weight: number | null
          weight_gross: number | null
          weight_net: number | null
          weight_tare: number | null
          weight_unit: string | null
        }
        Insert: {
          client_address?: string | null
          client_hidden_at?: string | null
          client_id?: string | null
          client_name?: string | null
          company_code: string
          created_at?: string | null
          deleted_at?: string | null
          driver_assignment_id?: string | null
          driver_id?: string | null
          driver_name?: string | null
          fill_level?: number | null
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by_id?: string | null
          processed_by_name?: string | null
          processing_note?: string | null
          proof_image_url?: string | null
          region_id?: string | null
          request_code?: string | null
          request_id?: string | null
          status?: string | null
          urgency?: string | null
          waste_label?: string | null
          waste_type?: string | null
          weight?: number | null
          weight_gross?: number | null
          weight_net?: number | null
          weight_tare?: number | null
          weight_unit?: string | null
        }
        Update: {
          client_address?: string | null
          client_hidden_at?: string | null
          client_id?: string | null
          client_name?: string | null
          company_code?: string
          created_at?: string | null
          deleted_at?: string | null
          driver_assignment_id?: string | null
          driver_id?: string | null
          driver_name?: string | null
          fill_level?: number | null
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by_id?: string | null
          processed_by_name?: string | null
          processing_note?: string | null
          proof_image_url?: string | null
          region_id?: string | null
          request_code?: string | null
          request_id?: string | null
          status?: string | null
          urgency?: string | null
          waste_label?: string | null
          waste_type?: string | null
          weight?: number | null
          weight_gross?: number | null
          weight_net?: number | null
          weight_tare?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_requests_driver_assignment_id_fkey"
            columns: ["driver_assignment_id"]
            isOneToOne: false
            referencedRelation: "driver_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_requests_processed_by_id_fkey"
            columns: ["processed_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          company_code: string
          created_at: string | null
          deleted_at: string | null
          id: string
          inventory_id: string | null
          name: string
        }
        Insert: {
          company_code: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          inventory_id?: string | null
          name: string
        }
        Update: {
          company_code?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          inventory_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_regions_company"
            columns: ["company_code"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "regions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventories"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_regions: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          region_id: string
          supervisor_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          region_id: string
          supervisor_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          region_id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_regions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_regions_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          allowed_waste_types: string[] | null
          auth_id: string | null
          company_code: string | null
          created_at: string | null
          deleted_at: string | null
          equipment_type: string | null
          equipment_types: string[] | null
          id: string
          is_owner: boolean | null
          latitude: number | null
          longitude: number | null
          manager_note: string | null
          name: string
          notification_preferences: Json | null
          password: string | null
          phone: string | null
          pib: string | null
          push_token: string | null
          push_token_updated_at: string | null
          region_id: string | null
          role: string | null
        }
        Insert: {
          address?: string | null
          allowed_waste_types?: string[] | null
          auth_id?: string | null
          company_code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          equipment_type?: string | null
          equipment_types?: string[] | null
          id?: string
          is_owner?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_note?: string | null
          name: string
          notification_preferences?: Json | null
          password?: string | null
          phone?: string | null
          pib?: string | null
          push_token?: string | null
          push_token_updated_at?: string | null
          region_id?: string | null
          role?: string | null
        }
        Update: {
          address?: string | null
          allowed_waste_types?: string[] | null
          auth_id?: string | null
          company_code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          equipment_type?: string | null
          equipment_types?: string[] | null
          id?: string
          is_owner?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_note?: string | null
          name?: string
          notification_preferences?: Json | null
          password?: string | null
          phone?: string | null
          pib?: string | null
          push_token?: string | null
          push_token_updated_at?: string | null
          region_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_drivers: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          driver_id: string
          id: string
          is_primary: boolean | null
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          driver_id: string
          id?: string
          is_primary?: boolean | null
          vehicle_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          driver_id?: string
          id?: string
          is_primary?: boolean | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_drivers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          capacity_kg: number | null
          company_code: string
          created_at: string | null
          deleted_at: string | null
          id: string
          model: string | null
          name: string | null
          notes: string | null
          registration: string
          status: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          capacity_kg?: number | null
          company_code: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          model?: string | null
          name?: string | null
          notes?: string | null
          registration: string
          status?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          capacity_kg?: number | null
          company_code?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          model?: string | null
          name?: string | null
          notes?: string | null
          registration?: string
          status?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_code_fkey"
            columns: ["company_code"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["code"]
          },
        ]
      }
      waste_types: {
        Row: {
          company_code: string
          created_at: string | null
          custom_image_url: string | null
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          region_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_code: string
          created_at?: string | null
          custom_image_url?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          region_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_code?: string
          created_at?: string | null
          custom_image_url?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          region_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_waste_types_company"
            columns: ["company_code"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "waste_types_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      fuel_stats_by_vehicle: {
        Row: {
          avg_consumption_per_100km: number | null
          avg_price_per_liter: number | null
          brand: string | null
          company_code: string | null
          first_refuel_date: string | null
          last_refuel_date: string | null
          max_odometer: number | null
          min_odometer: number | null
          model: string | null
          refuel_count: number | null
          registration: string | null
          total_cost: number | null
          total_liters: number | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_stats_monthly: {
        Row: {
          avg_price: number | null
          company_code: string | null
          month: string | null
          refuel_count: number | null
          registration: string | null
          total_cost: number | null
          total_liters: number | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_driver_locations: { Args: never; Returns: number }
      assign_region_inventory: {
        Args: { p_inventory_id?: string; p_region_id: string }
        Returns: {
          company_code: string
          created_at: string | null
          deleted_at: string | null
          id: string
          inventory_id: string | null
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "regions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_requests_to_driver: {
        Args: {
          p_company_code: string
          p_driver_id: string
          p_request_ids: string[]
        }
        Returns: Json
      }
      calculate_fuel_consumption: {
        Args: { p_from_date?: string; p_to_date?: string; p_vehicle_id: string }
        Returns: {
          consumption_per_100km: number
          date: string
          km_since_last: number
          liters: number
          odometer_km: number
        }[]
      }
      can_manage_supervisor_regions: {
        Args: { p_supervisor_id?: string }
        Returns: boolean
      }
      cancel_outbound: {
        Args: { p_outbound_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          company_code: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string
          id: string
          inventory_id: string
          notes: string | null
          price_per_kg: number | null
          quantity_planned_kg: number
          quantity_received_kg: number | null
          recipient_address: string | null
          recipient_contact: string | null
          recipient_name: string
          region_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          total_amount: number | null
          waste_type_id: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory_outbound"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_outbound: {
        Args: { p_outbound_id: string; p_quantity_received_kg: number }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          company_code: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string
          id: string
          inventory_id: string
          notes: string | null
          price_per_kg: number | null
          quantity_planned_kg: number
          quantity_received_kg: number | null
          recipient_address: string | null
          recipient_contact: string | null
          recipient_name: string
          region_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          total_amount: number | null
          waste_type_id: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory_outbound"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_inventory_adjustment: {
        Args: {
          p_created_by?: string
          p_created_by_name?: string
          p_inventory_id: string
          p_notes?: string
          p_quantity_kg: number
          p_transaction_type: string
          p_waste_type_id: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_data?: Json
          p_message?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_outbound: {
        Args: {
          p_inventory_id: string
          p_notes?: string
          p_price_per_kg?: number
          p_quantity_kg: number
          p_recipient_address?: string
          p_recipient_contact?: string
          p_recipient_name: string
          p_waste_type_id: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          company_code: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string
          id: string
          inventory_id: string
          notes: string | null
          price_per_kg: number | null
          quantity_planned_kg: number
          quantity_received_kg: number | null
          recipient_address: string | null
          recipient_contact: string | null
          recipient_name: string
          region_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          total_amount: number | null
          waste_type_id: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory_outbound"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_region: {
        Args: { p_region_id: string; p_user_id: string }
        Returns: undefined
      }
      delete_user_permanently: {
        Args: { p_requesting_user_id: string; p_target_user_id: string }
        Returns: undefined
      }
      get_chat_partners: {
        Args: { partner_ids: string[] }
        Returns: {
          deleted_at: string
          id: string
          name: string
          phone: string
          role: string
        }[]
      }
      get_current_user_info: {
        Args: never
        Returns: Database["public"]["CompositeTypes"]["current_user_info"]
        SetofOptions: {
          from: "*"
          to: "current_user_info"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_driver_push_token: { Args: { p_driver_id: string }; Returns: string }
      get_my_company_code: { Args: never; Returns: string }
      get_my_company_code_bypass: { Args: never; Returns: string }
      get_my_region_id: { Args: never; Returns: string }
      get_my_region_id_bypass: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_role_bypass: { Args: never; Returns: string }
      get_my_supervisor_regions: { Args: never; Returns: string[] }
      get_my_user_id: { Args: never; Returns: string }
      get_my_user_id_uuid: { Args: never; Returns: string }
      get_push_tokens_for_company: {
        Args: { p_company_code: string; p_role?: string }
        Returns: {
          push_token: string
          user_id: string
          user_name: string
        }[]
      }
      get_supervisor_region_ids: {
        Args: { p_user_id?: string }
        Returns: string[]
      }
      get_user_company_code: { Args: { user_auth_id: string }; Returns: string }
      get_user_id: { Args: { user_auth_id: string }; Returns: string }
      get_user_role: { Args: { user_auth_id: string }; Returns: string }
      is_company_owner: { Args: never; Returns: boolean }
      is_supervisor_for_region: {
        Args: { p_region_id: string }
        Returns: boolean
      }
      is_supervisor_in_company: {
        Args: { p_company_code: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_action: string
          p_company_code: string
          p_description: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_region_id?: string
          p_user_id: string
          p_user_name: string
          p_user_role: string
        }
        Returns: string
      }
      process_pickup_request: {
        Args: {
          p_company_code: string
          p_driver_id?: string
          p_driver_name?: string
          p_notes?: string
          p_processor_id: string
          p_processor_name: string
          p_proof_image_url?: string
          p_request_id: string
          p_status?: string
          p_weight?: number
          p_weight_unit?: string
        }
        Returns: Json
      }
      reject_pickup_request: {
        Args: {
          p_company_code: string
          p_notes?: string
          p_processor_id: string
          p_processor_name: string
          p_request_id: string
        }
        Returns: Json
      }
      send_outbound: {
        Args: { p_outbound_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          company_code: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string
          id: string
          inventory_id: string
          notes: string | null
          price_per_kg: number | null
          quantity_planned_kg: number
          quantity_received_kg: number | null
          recipient_address: string | null
          recipient_contact: string | null
          recipient_name: string
          region_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          total_amount: number | null
          waste_type_id: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory_outbound"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_region: { Args: { p_region_id: string }; Returns: undefined }
      update_client_details: {
        Args: {
          p_allowed_waste_types?: string[]
          p_client_id: string
          p_equipment_types: string[]
          p_manager_note: string
          p_pib: string
        }
        Returns: boolean
      }
      update_client_location: {
        Args: { addr?: string; client_id: string; lat: number; lng: number }
        Returns: boolean
      }
      update_driver_location: {
        Args: {
          p_accuracy?: number
          p_altitude?: number
          p_battery_level?: number
          p_driver_id: string
          p_heading?: number
          p_is_charging?: boolean
          p_latitude: number
          p_longitude: number
          p_speed?: number
        }
        Returns: {
          accuracy: number | null
          altitude: number | null
          battery_level: number | null
          company_code: string
          created_at: string
          driver_id: string
          heading: number | null
          id: string
          is_charging: boolean | null
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "driver_locations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_waste_type: {
        Args: {
          p_custom_image_url?: string
          p_description?: string
          p_icon?: string
          p_name?: string
          p_region_id?: string
          p_waste_type_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      current_user_info: {
        user_id: string | null
        role: string | null
        company_code: string | null
        region_id: string | null
        supervisor_region_ids: string[] | null
      }
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
    Enums: {},
  },
} as const
