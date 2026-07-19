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
      blog_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          author_email: string | null
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          like_count: number
          parent_id: string | null
          post_id: string
          report_count: number
          status: string
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          author_name: string
          body: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          post_id: string
          report_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          post_id?: string
          report_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          reading_minutes: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          reading_minutes?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          reading_minutes?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_key?: string
          user_id?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          owner_id: string | null
          phone: string | null
          preferred_date: string | null
          property_key: string
          sender_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          owner_id?: string | null
          phone?: string | null
          preferred_date?: string | null
          property_key: string
          sender_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          preferred_date?: string | null
          property_key?: string
          sender_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json
          type: Database["public"]["Enums"]["lead_activity_type"]
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json
          type: Database["public"]["Enums"]["lead_activity_type"]
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json
          type?: Database["public"]["Enums"]["lead_activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          lead_id: string
          notes: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at: string
          id?: string
          lead_id: string
          notes?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          created_by: string | null
          deal_value: number | null
          id: string
          inquiry_id: string | null
          last_contacted_at: string | null
          lost_reason: string | null
          message: string | null
          next_follow_up_at: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["lead_priority"]
          property_id: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          viewing_id: string | null
          won_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          created_by?: string | null
          deal_value?: number | null
          id?: string
          inquiry_id?: string | null
          last_contacted_at?: string | null
          lost_reason?: string | null
          message?: string | null
          next_follow_up_at?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          property_id?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          viewing_id?: string | null
          won_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          created_by?: string | null
          deal_value?: number | null
          id?: string
          inquiry_id?: string | null
          last_contacted_at?: string | null
          lost_reason?: string | null
          message?: string | null
          next_follow_up_at?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          property_id?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          viewing_id?: string | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: true
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_viewing_id_fkey"
            columns: ["viewing_id"]
            isOneToOne: true
            referencedRelation: "viewings"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_transactions: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          duration_days: number | null
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          phone_number: string
          property_id: string | null
          purpose: Database["public"]["Enums"]["mpesa_purpose"]
          raw_callback: Json | null
          result_code: number | null
          result_desc: string | null
          status: Database["public"]["Enums"]["mpesa_status"]
          tier: Database["public"]["Enums"]["agent_tier"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string
          duration_days?: number | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          phone_number: string
          property_id?: string | null
          purpose: Database["public"]["Enums"]["mpesa_purpose"]
          raw_callback?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: Database["public"]["Enums"]["mpesa_status"]
          tier?: Database["public"]["Enums"]["agent_tier"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          duration_days?: number | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          phone_number?: string
          property_id?: string | null
          purpose?: Database["public"]["Enums"]["mpesa_purpose"]
          raw_callback?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: Database["public"]["Enums"]["mpesa_status"]
          tier?: Database["public"]["Enums"]["agent_tier"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          listing_quota: number
          phone: string | null
          role_primary: string | null
          tier: Database["public"]["Enums"]["agent_tier"]
          tier_expires_at: string | null
          updated_at: string
          verified: boolean
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          listing_quota?: number
          phone?: string | null
          role_primary?: string | null
          tier?: Database["public"]["Enums"]["agent_tier"]
          tier_expires_at?: string | null
          updated_at?: string
          verified?: boolean
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          listing_quota?: number
          phone?: string | null
          role_primary?: string | null
          tier?: Database["public"]["Enums"]["agent_tier"]
          tier_expires_at?: string | null
          updated_at?: string
          verified?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          amenities: string[]
          area: string | null
          availability_status: string
          bathrooms: number
          bedrooms: number
          category: string
          contact_phone: string | null
          contact_whatsapp: string | null
          county: string
          created_at: string
          description: string
          documents: Json
          expires_at: string | null
          featured: boolean
          featured_until: string | null
          features: string[]
          id: string
          images: string[]
          is_featured: boolean
          lat: number | null
          listing_type: string | null
          lng: number | null
          owner_id: string
          price: number
          price_previous: number | null
          price_reduced_from: number | null
          price_suffix: string | null
          property_type: string
          published_at: string | null
          purpose: string | null
          size: string | null
          slug: string | null
          status: string
          title: string
          town: string
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          video_url: string | null
        }
        Insert: {
          amenities?: string[]
          area?: string | null
          availability_status?: string
          bathrooms?: number
          bedrooms?: number
          category: string
          contact_phone?: string | null
          contact_whatsapp?: string | null
          county: string
          created_at?: string
          description?: string
          documents?: Json
          expires_at?: string | null
          featured?: boolean
          featured_until?: string | null
          features?: string[]
          id?: string
          images?: string[]
          is_featured?: boolean
          lat?: number | null
          listing_type?: string | null
          lng?: number | null
          owner_id: string
          price: number
          price_previous?: number | null
          price_reduced_from?: number | null
          price_suffix?: string | null
          property_type: string
          published_at?: string | null
          purpose?: string | null
          size?: string | null
          slug?: string | null
          status?: string
          title: string
          town: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
        }
        Update: {
          amenities?: string[]
          area?: string | null
          availability_status?: string
          bathrooms?: number
          bedrooms?: number
          category?: string
          contact_phone?: string | null
          contact_whatsapp?: string | null
          county?: string
          created_at?: string
          description?: string
          documents?: Json
          expires_at?: string | null
          featured?: boolean
          featured_until?: string | null
          features?: string[]
          id?: string
          images?: string[]
          is_featured?: boolean
          lat?: number | null
          listing_type?: string | null
          lng?: number | null
          owner_id?: string
          price?: number
          price_previous?: number | null
          price_reduced_from?: number | null
          price_suffix?: string | null
          property_type?: string
          published_at?: string | null
          purpose?: string | null
          size?: string | null
          slug?: string | null
          status?: string
          title?: string
          town?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      property_views: {
        Row: {
          created_at: string
          id: string
          property_key: string
          viewer_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          property_key: string
          viewer_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          property_key?: string
          viewer_user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          status: string
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          last_notified_at: string | null
          name: string
          notify_email: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string | null
          name: string
          notify_email?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string | null
          name?: string
          notify_email?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          additional_docs: Json
          created_at: string
          id: string
          id_document_url: string | null
          notes: string | null
          property_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["verification_status"]
          title_deed_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_docs?: Json
          created_at?: string
          id?: string
          id_document_url?: string | null
          notes?: string | null
          property_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          title_deed_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_docs?: Json
          created_at?: string
          id?: string
          id_document_url?: string | null
          notes?: string | null
          property_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          title_deed_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      viewings: {
        Row: {
          agent_notes: string | null
          cancel_reason: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          property_id: string
          proposed_at: string | null
          requested_at: string
          requester_email: string
          requester_id: string | null
          requester_name: string
          requester_phone: string | null
          rescheduled_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_notes?: string | null
          cancel_reason?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          proposed_at?: string | null
          requested_at: string
          requester_email: string
          requester_id?: string | null
          requester_name: string
          requester_phone?: string | null
          rescheduled_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_notes?: string | null
          cancel_reason?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          proposed_at?: string | null
          requested_at?: string
          requester_email?: string
          requester_id?: string | null
          requester_name?: string
          requester_phone?: string | null
          rescheduled_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agent_tier: "free" | "basic" | "pro" | "elite"
      app_role:
        | "admin"
        | "agent"
        | "user"
        | "owner"
        | "buyer"
        | "tenant"
        | "developer"
      lead_activity_type:
        | "note"
        | "call"
        | "whatsapp"
        | "email"
        | "status_change"
        | "assignment"
        | "viewing"
        | "follow_up"
        | "created"
      lead_priority: "low" | "medium" | "high"
      lead_source:
        | "inquiry"
        | "viewing_request"
        | "whatsapp"
        | "phone"
        | "manual"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "viewing_scheduled"
        | "negotiation"
        | "won"
        | "lost"
      mpesa_purpose:
        | "feature_listing"
        | "upgrade_tier"
        | "verification_fee"
        | "other"
      mpesa_status: "pending" | "success" | "failed" | "cancelled"
      verification_status: "pending" | "approved" | "rejected"
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
      agent_tier: ["free", "basic", "pro", "elite"],
      app_role: [
        "admin",
        "agent",
        "user",
        "owner",
        "buyer",
        "tenant",
        "developer",
      ],
      lead_activity_type: [
        "note",
        "call",
        "whatsapp",
        "email",
        "status_change",
        "assignment",
        "viewing",
        "follow_up",
        "created",
      ],
      lead_priority: ["low", "medium", "high"],
      lead_source: [
        "inquiry",
        "viewing_request",
        "whatsapp",
        "phone",
        "manual",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "viewing_scheduled",
        "negotiation",
        "won",
        "lost",
      ],
      mpesa_purpose: [
        "feature_listing",
        "upgrade_tier",
        "verification_fee",
        "other",
      ],
      mpesa_status: ["pending", "success", "failed", "cancelled"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
