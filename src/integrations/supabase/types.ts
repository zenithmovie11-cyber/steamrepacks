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
      app_roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          permissions: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          permissions?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          permissions?: string[]
        }
        Relationships: []
      }
      bottom_cta_settings: {
        Row: {
          alignment: string
          background_image_url: string
          headline: string
          id: number
          is_visible: boolean
          primary_button_link: string
          primary_button_text: string
          secondary_button_link: string
          secondary_button_text: string
          secondary_enabled: boolean
          subtitle: string
          updated_at: string
        }
        Insert: {
          alignment?: string
          background_image_url?: string
          headline?: string
          id?: number
          is_visible?: boolean
          primary_button_link?: string
          primary_button_text?: string
          secondary_button_link?: string
          secondary_button_text?: string
          secondary_enabled?: boolean
          subtitle?: string
          updated_at?: string
        }
        Update: {
          alignment?: string
          background_image_url?: string
          headline?: string
          id?: number
          is_visible?: boolean
          primary_button_link?: string
          primary_button_text?: string
          secondary_button_link?: string
          secondary_button_text?: string
          secondary_enabled?: boolean
          subtitle?: string
          updated_at?: string
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
      ip_security_counters: {
        Row: {
          blocked_until: string | null
          ip: unknown
          last_logged: string | null
          requests: number
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          ip: unknown
          last_logged?: string | null
          requests?: number
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          ip?: unknown
          last_logged?: string | null
          requests?: number
          window_start?: string
        }
        Relationships: []
      }
      ip_security_events: {
        Row: {
          asn: string | null
          bot_signal: string | null
          country: string
          created_at: string
          decision: string
          id: string
          ip: unknown
          path: string
        }
        Insert: {
          asn?: string | null
          bot_signal?: string | null
          country?: string
          created_at?: string
          decision: string
          id?: string
          ip: unknown
          path: string
        }
        Update: {
          asn?: string | null
          bot_signal?: string | null
          country?: string
          created_at?: string
          decision?: string
          id?: string
          ip?: unknown
          path?: string
        }
        Relationships: []
      }
      ip_security_rules: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          network: unknown
          reason: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: string
          network: unknown
          reason?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          network?: unknown
          reason?: string
        }
        Relationships: []
      }
      ip_security_settings: {
        Row: {
          block_bot_signals: boolean
          block_minutes: number
          id: number
          rate_limit_enabled: boolean
          requests_per_minute: number
        }
        Insert: {
          block_bot_signals?: boolean
          block_minutes?: number
          id?: number
          rate_limit_enabled?: boolean
          requests_per_minute?: number
        }
        Update: {
          block_bot_signals?: boolean
          block_minutes?: number
          id?: number
          rate_limit_enabled?: boolean
          requests_per_minute?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          bkash_number: string
          city: string
          created_at: string
          email: string
          full_name: string
          id: string
          payment_ref: string | null
          phone: string
          post_ids: string[]
          status: string
          total: number
          user_id: string
        }
        Insert: {
          address: string
          bkash_number: string
          city: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          payment_ref?: string | null
          phone: string
          post_ids: string[]
          status?: string
          total?: number
          user_id?: string
        }
        Update: {
          address?: string
          bkash_number?: string
          city?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          payment_ref?: string | null
          phone?: string
          post_ids?: string[]
          status?: string
          total?: number
          user_id?: string
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
      security_audit_logs: {
        Row: {
          action: string
          actor_email: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target: string
        }
        Insert: {
          action: string
          actor_email: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target: string
        }
        Update: {
          action?: string
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string
        }
        Relationships: []
      }
      special_offers: {
        Row: {
          badge_text: string
          banner_text: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          post_ids: string[]
          show_banner: boolean
          starts_at: string | null
          title: string
        }
        Insert: {
          badge_text?: string
          banner_text?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          post_ids?: string[]
          show_banner?: boolean
          starts_at?: string | null
          title: string
        }
        Update: {
          badge_text?: string
          banner_text?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          post_ids?: string[]
          show_banner?: boolean
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          email: string
          id: string
          protected: boolean
          role_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          protected?: boolean
          role_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          protected?: boolean
          role_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
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
      assign_app_role: {
        Args: { p_email: string; p_role: string }
        Returns: undefined
      }
      dev_console_overview: { Args: never; Returns: Json }
      enforce_ip_security: {
        Args: {
          p_asn: string
          p_bot_signal: string
          p_country: string
          p_ip: string
          p_path: string
        }
        Returns: string
      }
      has_permission: { Args: { p_permission: string }; Returns: boolean }
      ip_security_overview: { Args: { p_offset?: number }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      manage_app_role: {
        Args: { p_id: string; p_name: string; p_permissions: string[] }
        Returns: string
      }
      manage_ip_security_rule: {
        Args: {
          p_delete?: boolean
          p_expires_at: string
          p_id: string
          p_kind: string
          p_network: string
          p_reason: string
        }
        Returns: string
      }
      my_permissions: { Args: never; Returns: string[] }
      post_play_urls: {
        Args: never
        Returns: {
          id: string
          play_url: string
        }[]
      }
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
      roles_security_data: { Args: never; Returns: Json }
      save_ip_security_settings: {
        Args: {
          p_block_bots: boolean
          p_block_minutes: number
          p_rate_limit: boolean
          p_rpm: number
        }
        Returns: undefined
      }
      security_audit_page: { Args: { p_offset?: number }; Returns: Json }
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
