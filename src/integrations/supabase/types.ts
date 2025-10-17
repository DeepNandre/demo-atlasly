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
      analysis_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          layer_data: Json | null
          metadata: Json | null
          parent_task_id: string | null
          progress: number
          query: string
          result: Json | null
          site_request_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          layer_data?: Json | null
          metadata?: Json | null
          parent_task_id?: string | null
          progress?: number
          query: string
          result?: Json | null
          site_request_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          layer_data?: Json | null
          metadata?: Json | null
          parent_task_id?: string | null
          progress?: number
          query?: string
          result?: Json | null
          site_request_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "analysis_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_tasks_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: false
            referencedRelation: "site_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          key_hash: string
          last_used_at: string | null
          name: string
          rate_limit: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          key_hash: string
          last_used_at?: string | null
          name: string
          rate_limit?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          key_hash?: string
          last_used_at?: string | null
          name?: string
          rate_limit?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_requests: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: string
          metadata: Json | null
          response_time_ms: number | null
          status_code: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status_code: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_requests_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_data: {
        Row: {
          created_at: string
          data: Json
          data_type: string
          expires_at: string
          fetched_at: string
          id: string
          metadata: Json | null
          site_request_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          data_type: string
          expires_at?: string
          fetched_at?: string
          id?: string
          metadata?: Json | null
          site_request_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          data_type?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          metadata?: Json | null
          site_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "environmental_data_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: false
            referencedRelation: "site_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      export_quality_checks: {
        Row: {
          created_at: string
          error_message: string | null
          file_size_bytes: number | null
          file_type: string
          id: string
          issues: Json | null
          metrics: Json | null
          quality_score: number | null
          site_request_id: string
          status: string
          validation_duration_ms: number | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_size_bytes?: number | null
          file_type: string
          id?: string
          issues?: Json | null
          metrics?: Json | null
          quality_score?: number | null
          site_request_id: string
          status?: string
          validation_duration_ms?: number | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          issues?: Json | null
          metrics?: Json | null
          quality_score?: number | null
          site_request_id?: string
          status?: string
          validation_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "export_quality_checks_site_request_id_fkey"
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
      usage_analytics: {
        Row: {
          created_at: string
          feature: Database["public"]["Enums"]["feature_name"]
          id: string
          metadata: Json | null
          site_request_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature: Database["public"]["Enums"]["feature_name"]
          id?: string
          metadata?: Json | null
          site_request_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature?: Database["public"]["Enums"]["feature_name"]
          id?: string
          metadata?: Json | null
          site_request_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_analytics_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: false
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
      user_drawings: {
        Row: {
          created_at: string
          geometry: Json
          id: string
          name: string
          properties: Json | null
          site_request_id: string
          style: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          geometry: Json
          id?: string
          name?: string
          properties?: Json | null
          site_request_id: string
          style?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          geometry?: Json
          id?: string
          name?: string
          properties?: Json | null
          site_request_id?: string
          style?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_drawings_site_request_id_fkey"
            columns: ["site_request_id"]
            isOneToOne: false
            referencedRelation: "site_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          features_enabled: Json | null
          id: string
          monthly_quota_used: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          features_enabled?: Json | null
          id?: string
          monthly_quota_used?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          features_enabled?: Json | null
          id?: string
          monthly_quota_used?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
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
      become_first_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      promote_to_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      feature_name:
        | "site_pack_generation"
        | "three_d_preview"
        | "ai_chat"
        | "visualization_generation"
        | "export_dxf"
        | "export_glb"
        | "export_pdf"
        | "solar_analysis"
        | "climate_data"
        | "elevation_analysis"
      site_pack_status: "pending" | "processing" | "completed" | "failed"
      subscription_tier: "free" | "pro" | "teams" | "enterprise"
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
      app_role: ["admin", "user"],
      feature_name: [
        "site_pack_generation",
        "three_d_preview",
        "ai_chat",
        "visualization_generation",
        "export_dxf",
        "export_glb",
        "export_pdf",
        "solar_analysis",
        "climate_data",
        "elevation_analysis",
      ],
      site_pack_status: ["pending", "processing", "completed", "failed"],
      subscription_tier: ["free", "pro", "teams", "enterprise"],
    },
  },
} as const
