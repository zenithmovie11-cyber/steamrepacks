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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analytics_pageviews: {
        Row: {
          created_at: string
          id: string
          path: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id: string
          path: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_pageviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          acquisition_recorded_at: string | null
          browser: string
          city: string
          country: string
          device: string
          engaged: boolean
          id: string
          last_seen: string
          os: string
          referrer_source: string | null
          started_at: string
          traffic_channel: string
          visitor_id: string
        }
        Insert: {
          acquisition_recorded_at?: string | null
          browser?: string
          city?: string
          country?: string
          device?: string
          engaged?: boolean
          id: string
          last_seen?: string
          os?: string
          referrer_source?: string | null
          started_at?: string
          traffic_channel?: string
          visitor_id: string
        }
        Update: {
          acquisition_recorded_at?: string | null
          browser?: string
          city?: string
          country?: string
          device?: string
          engaged?: boolean
          id?: string
          last_seen?: string
          os?: string
          referrer_source?: string | null
          started_at?: string
          traffic_channel?: string
          visitor_id?: string
        }
        Relationships: []
      }
      hero_slide_clicks: {
        Row: {
          created_at: string
          id: string
          session_id: string
          slide_id: string
        }
        Insert: {
          created_at?: string
          id: string
          session_id: string
          slide_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          slide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_slide_clicks_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "hero_slides"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slider_settings: {
        Row: {
          autoplay: boolean
          id: number
          interval_ms: number
          loop: boolean
          pause_on_hover: boolean
          show_arrows: boolean
          show_dots: boolean
        }
        Insert: {
          autoplay?: boolean
          id?: number
          interval_ms?: number
          loop?: boolean
          pause_on_hover?: boolean
          show_arrows?: boolean
          show_dots?: boolean
        }
        Update: {
          autoplay?: boolean
          id?: number
          interval_ms?: number
          loop?: boolean
          pause_on_hover?: boolean
          show_arrows?: boolean
          show_dots?: boolean
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          button_text: string | null
          button_url: string | null
          created_at: string
          description: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title: string
          video_url?: string | null
        }
        Update: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          description: string
          device_support: string
          file_name: string | null
          file_url: string | null
          id: string
          is_paid: boolean
          play_url: string | null
          price: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          device_support?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_paid?: boolean
          play_url?: string | null
          price?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          device_support?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_paid?: boolean
          play_url?: string | null
          price?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      visitor_pings: {
        Row: {
          first_seen: string
          last_seen: string
          path: string | null
          session_id: string
        }
        Insert: {
          first_seen?: string
          last_seen?: string
          path?: string | null
          session_id: string
        }
        Update: {
          first_seen?: string
          last_seen?: string
          path?: string | null
          session_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_analytics: { Args: { p_days?: number }; Returns: Json }
      admin_analytics_acquisition: { Args: { p_days?: number }; Returns: Json }
      admin_hero_slide_stats: { Args: { p_days?: number }; Returns: Json }
      dev_console_overview: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      record_analytics_acquisition: {
        Args: {
          p_browser: string
          p_channel: string
          p_city: string
          p_country: string
          p_device: string
          p_engaged: boolean
          p_os: string
          p_path: string
          p_session: string
          p_source: string
          p_view: string
          p_visitor: string
        }
        Returns: undefined
      }
      record_analytics_event: {
        Args: {
          p_browser: string
          p_city: string
          p_country: string
          p_device: string
          p_engaged: boolean
          p_os: string
          p_path: string
          p_session: string
          p_view: string
          p_visitor: string
        }
        Returns: undefined
      }
      record_hero_slide_click: {
        Args: { p_id: string; p_session: string; p_slide: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
