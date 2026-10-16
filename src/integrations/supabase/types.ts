export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      collector_control: {
        Row: {
          cursors: Json;
          enabled: boolean;
          id: string;
          last_finished_at: string | null;
          lease_token: string | null;
          lease_until: string | null;
          visitor_id: string;
        };
        Insert: {
          cursors?: Json;
          enabled?: boolean;
          id: string;
          last_finished_at?: string | null;
          lease_token?: string | null;
          lease_until?: string | null;
          visitor_id?: string;
        };
        Update: {
          cursors?: Json;
          enabled?: boolean;
          id?: string;
          last_finished_at?: string | null;
          lease_token?: string | null;
          lease_until?: string | null;
          visitor_id?: string;
        };
        Relationships: [];
      };
      collector_runs: {
        Row: {
          finished_at: string;
          id: string;
          started_at: string;
          summary: Json;
        };
        Insert: {
          finished_at?: string;
          id: string;
          started_at: string;
          summary: Json;
        };
        Update: {
          finished_at?: string;
          id?: string;
          started_at?: string;
          summary?: Json;
        };
        Relationships: [];
      };
      collector_seen_nonces: {
        Row: {
          expires_at: string;
          nonce: string;
        };
        Insert: {
          expires_at: string;
          nonce: string;
        };
        Update: {
          expires_at?: string;
          nonce?: string;
        };
        Relationships: [];
      };
      deals: {
        Row: {
          coupon_code: string | null;
          coupon_url: string | null;
          created_at: string;
          created_by: string | null;
          deal_url: string;
          description: string | null;
          expires_at: string | null;
          id: string;
          image_url: string | null;
          original_price_cents: number | null;
          payment_conditions: string | null;
          platform_id: string;
          pre_order: boolean;
          price_cents: number;
          rules: string | null;
          status: string;
          store_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          coupon_code?: string | null;
          coupon_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          deal_url: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          image_url?: string | null;
          original_price_cents?: number | null;
          payment_conditions?: string | null;
          platform_id: string;
          pre_order?: boolean;
          price_cents: number;
          rules?: string | null;
          status?: string;
          store_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          coupon_code?: string | null;
          coupon_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          deal_url?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          image_url?: string | null;
          original_price_cents?: number | null;
          payment_conditions?: string | null;
          platform_id?: string;
          pre_order?: boolean;
          price_cents?: number;
          rules?: string | null;
          status?: string;
          store_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deals_platform_id_fkey";
            columns: ["platform_id"];
            isOneToOne: false;
            referencedRelation: "platforms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      imported_offers: {
        Row: {
          deal_id: string | null;
          external_id: string;
          id: string;
          received_at: string;
          review_status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source: string;
          source_collected_at: string;
          source_data: Json;
          updated_at: string;
        };
        Insert: {
          deal_id?: string | null;
          external_id: string;
          id?: string;
          received_at?: string;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source: string;
          source_collected_at: string;
          source_data: Json;
          updated_at?: string;
        };
        Update: {
          deal_id?: string | null;
          external_id?: string;
          id?: string;
          received_at?: string;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source?: string;
          source_collected_at?: string;
          source_data?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "imported_offers_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      offer_verification_cache: {
        Row: {
          expires_at: string | null;
          lease_token: string | null;
          lease_until: string | null;
          product_url: string;
          result: Json | null;
        };
        Insert: {
          expires_at?: string | null;
          lease_token?: string | null;
          lease_until?: string | null;
          product_url: string;
          result?: Json | null;
        };
        Update: {
          expires_at?: string | null;
          lease_token?: string | null;
          lease_until?: string | null;
          product_url?: string;
          result?: Json | null;
        };
        Relationships: [];
      };
      platforms: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          website_url: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          website_url?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      attach_offer_verification: {
        Args: { p_expected_url: string; p_id: string; p_result: Json };
        Returns: boolean;
      };
      claim_offer_verification: { Args: { p_url: string }; Returns: Json };
      claim_pelando_collection: { Args: { p_nonce: string }; Returns: Json };
      complete_offer_verification: {
        Args: { p_result: Json; p_token: string; p_url: string };
        Returns: undefined;
      };
      convert_imported_offer: {
        Args: { p_id: string; p_values: Json };
        Returns: string;
      };
      dispatch_pelando_collection: { Args: never; Returns: number };
      expire_deals: { Args: never; Returns: number };
      finish_pelando_collection: {
        Args: {
          p_cursors: Json;
          p_offers: Json;
          p_summary: Json;
          p_token: string;
        };
        Returns: Json;
      };
      import_content_fingerprint: { Args: { p_data: Json }; Returns: string };
      ingest_imported_offers: { Args: { p_offers: Json }; Returns: Json };
      is_admin: { Args: never; Returns: boolean };
      review_imported_offer: {
        Args: { p_id: string; p_status: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
