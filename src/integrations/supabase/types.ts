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
