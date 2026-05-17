export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          username: string | null;
          username_normalized: string | null;
          email: string | null;
          name: string | null;
          role: "user" | "admin";
          login_method: string | null;
          created_at: string;
          updated_at: string;
          last_signed_in: string | null;
        };
        Insert: {
          user_id: string;
          username?: string | null;
          email?: string | null;
          name?: string | null;
          role?: "user" | "admin";
          login_method?: string | null;
          last_signed_in?: string | null;
        };
        Update: {
          username?: string | null;
          email?: string | null;
          name?: string | null;
          role?: "user" | "admin";
          login_method?: string | null;
          last_signed_in?: string | null;
        };
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          category: string | null;
          emoji: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          category?: string | null;
          emoji?: string | null;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          category?: string | null;
          emoji?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "restaurants_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      ratings: {
        Row: {
          id: number;
          user_id: string;
          restaurant_id: number;
          score: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          restaurant_id: number;
          score: number;
          comment?: string | null;
        };
        Update: {
          score?: number;
          comment?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "ratings_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      blacklist: {
        Row: {
          id: number;
          user_id: string;
          restaurant_id: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          restaurant_id: number;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "blacklist_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "blacklist_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_restaurant_rating_stats: {
        Args: Record<string, never>;
        Returns: {
          restaurant_id: number;
          average: number | null;
          count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
