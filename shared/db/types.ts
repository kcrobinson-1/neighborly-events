export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      event_role_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_role_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "game_events"
            referencedColumns: ["id"]
          },
        ]
      }
      game_completions: {
        Row: {
          attempt_number: number
          client_session_id: string
          completed_at: string
          duration_ms: number
          entitlement_awarded: boolean
          entitlement_id: string
          event_id: string
          id: string
          request_id: string
          score: number
          submitted_answers: Json
          verification_code: string
        }
        Insert: {
          attempt_number: number
          client_session_id: string
          completed_at?: string
          duration_ms: number
          entitlement_awarded?: boolean
          entitlement_id: string
          event_id: string
          id?: string
          request_id: string
          score: number
          submitted_answers: Json
          verification_code: string
        }
        Update: {
          attempt_number?: number
          client_session_id?: string
          completed_at?: string
          duration_ms?: number
          entitlement_awarded?: boolean
          entitlement_id?: string
          event_id?: string
          id?: string
          request_id?: string
          score?: number
          submitted_answers?: Json
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_completions_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "game_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      game_entitlements: {
        Row: {
          client_session_id: string
          created_at: string
          event_id: string
          first_completion_id: string | null
          id: string
          redeemed_at: string | null
          redeemed_by: string | null
          redeemed_by_role: string | null
          redeemed_event_id: string | null
          redemption_note: string | null
          redemption_reversed_at: string | null
          redemption_reversed_by: string | null
          redemption_reversed_by_role: string | null
          redemption_status: string
          status: string
          verification_code: string
        }
        Insert: {
          client_session_id: string
          created_at?: string
          event_id: string
          first_completion_id?: string | null
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_by_role?: string | null
          redeemed_event_id?: string | null
          redemption_note?: string | null
          redemption_reversed_at?: string | null
          redemption_reversed_by?: string | null
          redemption_reversed_by_role?: string | null
          redemption_status?: string
          status?: string
          verification_code: string
        }
        Update: {
          client_session_id?: string
          created_at?: string
          event_id?: string
          first_completion_id?: string | null
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_by_role?: string | null
          redeemed_event_id?: string | null
          redemption_note?: string | null
          redemption_reversed_at?: string | null
          redemption_reversed_by?: string | null
          redemption_reversed_by_role?: string | null
          redemption_status?: string
          status?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_entitlements_first_completion_fk"
            columns: ["first_completion_id"]
            isOneToOne: false
            referencedRelation: "game_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_event_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          event_id: string
          id: number
          metadata: Json
          version_number: number | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          event_id: string
          id?: never
          metadata?: Json
          version_number?: number | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          event_id?: string
          id?: never
          metadata?: Json
          version_number?: number | null
        }
        Relationships: []
      }
      game_event_drafts: {
        Row: {
          content: Json
          created_at: string
          event_code: string
          id: string
          last_published_at: string | null
          last_published_by: string | null
          last_published_version_number: number | null
          last_saved_by: string | null
          name: string
          schema_version: number
          slug: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          event_code: string
          id: string
          last_published_at?: string | null
          last_published_by?: string | null
          last_published_version_number?: number | null
          last_saved_by?: string | null
          name: string
          schema_version?: number
          slug: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          event_code?: string
          id?: string
          last_published_at?: string | null
          last_published_by?: string | null
          last_published_version_number?: number | null
          last_saved_by?: string | null
          name?: string
          schema_version?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_event_versions: {
        Row: {
          content: Json
          event_id: string
          published_at: string
          published_by: string | null
          schema_version: number
          version_number: number
        }
        Insert: {
          content: Json
          event_id: string
          published_at?: string
          published_by?: string | null
          schema_version?: number
          version_number: number
        }
        Update: {
          content?: Json
          event_id?: string
          published_at?: string
          published_by?: string | null
          schema_version?: number
          version_number?: number
        }
        Relationships: []
      }
      game_events: {
        Row: {
          allow_back_navigation: boolean
          allow_retake: boolean
          created_at: string
          entitlement_label: string
          estimated_minutes: number
          event_code: string
          feedback_mode: string
          id: string
          intro: string
          location: string
          name: string
          published_at: string | null
          slug: string
          summary: string
          updated_at: string
        }
        Insert: {
          allow_back_navigation?: boolean
          allow_retake?: boolean
          created_at?: string
          entitlement_label: string
          estimated_minutes: number
          event_code: string
          feedback_mode: string
          id: string
          intro: string
          location: string
          name: string
          published_at?: string | null
          slug: string
          summary: string
          updated_at?: string
        }
        Update: {
          allow_back_navigation?: boolean
          allow_retake?: boolean
          created_at?: string
          entitlement_label?: string
          estimated_minutes?: number
          event_code?: string
          feedback_mode?: string
          id?: string
          intro?: string
          location?: string
          name?: string
          published_at?: string | null
          slug?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_question_options: {
        Row: {
          display_order: number
          event_id: string
          id: string
          is_correct: boolean
          label: string
          question_id: string
        }
        Insert: {
          display_order: number
          event_id: string
          id: string
          is_correct?: boolean
          label: string
          question_id: string
        }
        Update: {
          display_order?: number
          event_id?: string
          id?: string
          is_correct?: boolean
          label?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_question_options_question_fk"
            columns: ["event_id", "question_id"]
            isOneToOne: false
            referencedRelation: "game_questions"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      game_questions: {
        Row: {
          display_order: number
          event_id: string
          explanation: string | null
          id: string
          prompt: string
          selection_mode: string
          sponsor: string | null
          sponsor_fact: string | null
        }
        Insert: {
          display_order: number
          event_id: string
          explanation?: string | null
          id: string
          prompt: string
          selection_mode: string
          sponsor?: string | null
          sponsor_fact?: string | null
        }
        Update: {
          display_order?: number
          event_id?: string
          explanation?: string | null
          id?: string
          prompt?: string
          selection_mode?: string
          sponsor?: string | null
          sponsor_fact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "game_events"
            referencedColumns: ["id"]
          },
        ]
      }
      game_starts: {
        Row: {
          client_session_id: string
          event_id: string
          id: string
          issued_at: string
        }
        Insert: {
          client_session_id: string
          event_id: string
          id?: string
          issued_at?: string
        }
        Update: {
          client_session_id?: string
          event_id?: string
          id?: string
          issued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_starts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "game_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      game_event_admin_status: {
        Row: {
          draft_updated_at: string | null
          event_code: string | null
          event_id: string | null
          first_published_at: string | null
          is_live: boolean | null
          last_published_at: string | null
          last_published_version_number: number | null
          name: string | null
          slug: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      complete_game_and_award_entitlement: {
        Args: {
          p_client_session_id: string
          p_duration_ms: number
          p_event_id: string
          p_request_id: string
          p_score: number
          p_submitted_answers: Json
        }
        Returns: {
          attempt_number: number
          completion_id: string
          entitlement_created_at: string
          entitlement_eligible: boolean
          entitlement_status: string
          message: string
          score: number
          verification_code: string
        }[]
      }
      current_request_email: { Args: never; Returns: string }
      current_request_user_id: { Args: never; Returns: string }
      generate_neighborly_verification_code: {
        Args: { p_event_code: string }
        Returns: string
      }
      generate_random_event_code: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_agent_for_event: {
        Args: { target_event_id: string }
        Returns: boolean
      }
      is_organizer_for_event: {
        Args: { target_event_id: string }
        Returns: boolean
      }
      is_root_admin: { Args: never; Returns: boolean }
      publish_game_event_draft: {
        Args: { p_event_id: string; p_published_by: string }
        Returns: {
          event_id: string
          published_at: string
          slug: string
          version_number: number
        }[]
      }
      redeem_entitlement_by_code: {
        Args: { p_code_suffix: string; p_event_id: string }
        Returns: Json
      }
      reverse_entitlement_redemption: {
        Args: { p_code_suffix: string; p_event_id: string; p_reason?: string }
        Returns: Json
      }
      unpublish_game_event: {
        Args: { p_actor_id: string; p_event_id: string }
        Returns: {
          event_id: string
          unpublished_at: string
        }[]
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

