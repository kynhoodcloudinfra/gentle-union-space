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
      leaderboard: {
        Row: {
          avatar_id: number | null
          display_name: string | null
          kyn_username: string | null
          last_played_date: string | null
          month: string
          name: string
          phone_number: string
          profile_image_url: string | null
          streak: number
          total_score: number
          updated_at: string
        }
        Insert: {
          avatar_id?: number | null
          display_name?: string | null
          kyn_username?: string | null
          last_played_date?: string | null
          month?: string
          name: string
          phone_number: string
          profile_image_url?: string | null
          streak?: number
          total_score?: number
          updated_at?: string
        }
        Update: {
          avatar_id?: number | null
          display_name?: string | null
          kyn_username?: string | null
          last_played_date?: string | null
          month?: string
          name?: string
          phone_number?: string
          profile_image_url?: string | null
          streak?: number
          total_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      players_since_jun1: {
        Row: {
          correct_count: number
          first_played_at: string | null
          kyn_username: string | null
          last_played_at: string | null
          name: string
          phone_number: string
          points_since_jun1: number
          quizzes_played: number
          updated_at: string
        }
        Insert: {
          correct_count?: number
          first_played_at?: string | null
          kyn_username?: string | null
          last_played_at?: string | null
          name: string
          phone_number: string
          points_since_jun1?: number
          quizzes_played?: number
          updated_at?: string
        }
        Update: {
          correct_count?: number
          first_played_at?: string | null
          kyn_username?: string | null
          last_played_at?: string | null
          name?: string
          phone_number?: string
          points_since_jun1?: number
          quizzes_played?: number
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          activated_at: string | null
          correct_answer: string
          created_at: string
          day_number: number | null
          expires_at: string | null
          has_been_live: boolean
          id: string
          image_url: string | null
          is_active: boolean
          month: string | null
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          question_text: string
          question_type: string
          scheduled_for: string | null
        }
        Insert: {
          activated_at?: string | null
          correct_answer: string
          created_at?: string
          day_number?: number | null
          expires_at?: string | null
          has_been_live?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          month?: string | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question_text: string
          question_type?: string
          scheduled_for?: string | null
        }
        Update: {
          activated_at?: string | null
          correct_answer?: string
          created_at?: string
          day_number?: number | null
          expires_at?: string | null
          has_been_live?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          month?: string | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question_text?: string
          question_type?: string
          scheduled_for?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          answer_given: string | null
          day_number: number
          display_name: string | null
          id: string
          is_correct: boolean
          kyn_username: string | null
          month: string
          name: string
          phone_number: string
          question_id: string
          submitted_at: string
          time_taken_seconds: number | null
        }
        Insert: {
          answer_given?: string | null
          day_number: number
          display_name?: string | null
          id?: string
          is_correct?: boolean
          kyn_username?: string | null
          month: string
          name: string
          phone_number: string
          question_id: string
          submitted_at?: string
          time_taken_seconds?: number | null
        }
        Update: {
          answer_given?: string | null
          day_number?: number
          display_name?: string | null
          id?: string
          is_correct?: boolean
          kyn_username?: string | null
          month?: string
          name?: string
          phone_number?: string
          question_id?: string
          submitted_at?: string
          time_taken_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          id: string
          last_seen_at: string
          phone_number: string
          played: boolean
          session_id: string
          started_at: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
          phone_number: string
          played?: boolean
          session_id: string
          started_at?: string
        }
        Update: {
          id?: string
          last_seen_at?: string
          phone_number?: string
          played?: boolean
          session_id?: string
          started_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rebuild_players_since_jun1: { Args: never; Returns: undefined }
      recompute_leaderboard_all: { Args: never; Returns: undefined }
      recompute_leaderboard_for: {
        Args: { p_phone: string }
        Returns: undefined
      }
      rotate_active_question: {
        Args: never
        Returns: {
          activated_at: string
          correct_answer: string
          day_number: number
          expires_at: string
          id: string
          image_url: string
          month: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          question_type: string
        }[]
      }
      update_leaderboard_identity: {
        Args: {
          p_avatar_id?: number
          p_clear_profile_image?: boolean
          p_display_name?: string
          p_kyn_username?: string
          p_phone: string
          p_profile_image_url?: string
        }
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
