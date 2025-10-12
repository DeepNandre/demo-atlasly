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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_logs: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          id: string
          model: string | null
          role: string
          site_request_id: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
          site_request_id: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          site_request_id?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: false
            referencedRelation: "site_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          page: string | null
          site_request_id: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          page?: string | null
          site_request_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          page?: string | null
          site_request_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: false
            referencedRelation: "site_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          site_request_id: string
          stage: string
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          site_request_id: string
          stage: string
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          site_request_id?: string
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_logs_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: false
            referencedRelation: "site_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      site_requests: {
        Row: {
          area_sqm: number | null
          artifact_key: string | null
          boundary_geojson: Json
          center_lat: number
          center_lng: number
          client_id: string | null
          climate_summary: Json | null
          completed_at: string | null
          created_at: string | null
          elevation_summary: Json | null
          email_sent: boolean | null
          error_message: string | null
          exports_dwg: boolean | null
          exports_pdf: boolean | null
          exports_skp: boolean | null
          file_count: number | null
          file_url: string | null
          id: string
          include_buildings: boolean | null
          include_dxf: boolean | null
          include_glb: boolean | null
          include_imagery: boolean | null
          include_landuse: boolean | null
          include_roads: boolean | null
          include_terrain: boolean | null
          location_name: string
          preview_image_url: string | null
          progress: number | null
          radius_meters: number | null
          status: Database["public"]["Enums"]["site_pack_status"] | null
          updated_at: string | null
          user_id: string | null
          zip_sha256: string | null
          zip_size_bytes: number | null
        }
        Insert: {
          area_sqm?: number | null
          artifact_key?: string | null
          boundary_geojson: Json
          center_lat: number
          center_lng: number
          client_id?: string | null
          climate_summary?: Json | null
          completed_at?: string | null
          created_at?: string | null
          elevation_summary?: Json | null
          email_sent?: boolean | null
          error_message?: string | null
          exports_dwg?: boolean | null
          exports_pdf?: boolean | null
          exports_skp?: boolean | null
          file_count?: number | null
          file_url?: string | null
          id?: string
          include_buildings?: boolean | null
          include_dxf?: boolean | null
          include_glb?: boolean | null
          include_imagery?: boolean | null
          include_landuse?: boolean | null
          include_roads?: boolean | null
          include_terrain?: boolean | null
          location_name: string
          preview_image_url?: string | null
          progress?: number | null
          radius_meters?: number | null
          status?: Database["public"]["Enums"]["site_pack_status"] | null
          updated_at?: string | null
          user_id?: string | null
          zip_sha256?: string | null
          zip_size_bytes?: number | null
        }
        Update: {
          area_sqm?: number | null
          artifact_key?: string | null
          boundary_geojson?: Json
          center_lat?: number
          center_lng?: number
          client_id?: string | null
          climate_summary?: Json | null
          completed_at?: string | null
          created_at?: string | null
          elevation_summary?: Json | null
          email_sent?: boolean | null
          error_message?: string | null
          exports_dwg?: boolean | null
          exports_pdf?: boolean | null
          exports_skp?: boolean | null
          file_count?: number | null
          file_url?: string | null
          id?: string
          include_buildings?: boolean | null
          include_dxf?: boolean | null
          include_glb?: boolean | null
          include_imagery?: boolean | null
          include_landuse?: boolean | null
          include_roads?: boolean | null
          include_terrain?: boolean | null
          location_name?: string
          preview_image_url?: string | null
          progress?: number | null
          radius_meters?: number | null
          status?: Database["public"]["Enums"]["site_pack_status"] | null
          updated_at?: string | null
          user_id?: string | null
          zip_sha256?: string | null
          zip_size_bytes?: number | null
        }
        Relationships: []
      }
      site_shares: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          likes: number
          share_card_url: string | null
          site_request_id: string
          views: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          likes?: number
          share_card_url?: string | null
          site_request_id: string
          views?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          likes?: number
          share_card_url?: string | null
          site_request_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_shares_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: true
            referencedRelation: "site_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          credits: number
          credits_used: number
          id: string
          last_reset_at: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          credits_used?: number
          id?: string
          last_reset_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          credits_used?: number
          id?: string
          last_reset_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visual_results: {
        Row: {
          created_at: string
          id: string
          input_url: string
          output_url: string
          prompt: string | null
          site_request_id: string
          style: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_url: string
          output_url: string
          prompt?: string | null
          site_request_id: string
          style: string
        }
        Update: {
          created_at?: string
          id?: string
          input_url?: string
          output_url?: string
          prompt?: string | null
          site_request_id?: string
          style?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_results_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: false
            referencedRelation: "site_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      site_pack_status: "pending" | "processing" | "completed" | "failed"
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
      site_pack_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const
