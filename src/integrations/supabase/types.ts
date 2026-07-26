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
      ad_campaigns: {
        Row: {
          admin_notes: string | null
          amount_paid: number
          clicks: number
          created_at: string
          expires_at: string | null
          id: string
          image_url: string
          impressions: number
          mpesa_transaction_id: string | null
          owner_id: string
          package_id: string
          pending_package_id: string | null
          placement: string
          starts_at: string | null
          status: string
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount_paid?: number
          clicks?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url: string
          impressions?: number
          mpesa_transaction_id?: string | null
          owner_id: string
          package_id: string
          pending_package_id?: string | null
          placement: string
          starts_at?: string | null
          status?: string
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount_paid?: number
          clicks?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string
          impressions?: number
          mpesa_transaction_id?: string | null
          owner_id?: string
          package_id?: string
          pending_package_id?: string | null
          placement?: string
          starts_at?: string | null
          status?: string
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ad_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_pending_package_id_fkey"
            columns: ["pending_package_id"]
            isOneToOne: false
            referencedRelation: "ad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_daily_stats: {
        Row: {
          campaign_id: string
          clicks: number
          day: string
          impressions: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          clicks?: number
          day: string
          impressions?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          clicks?: number
          day?: string
          impressions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_daily_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_packages: {
        Row: {
          active: boolean
          badge_color: string | null
          created_at: string
          description: string | null
          duration_days: number
          height_px: number
          id: string
          max_active: number
          name: string
          placement: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
          width_px: number
        }
        Insert: {
          active?: boolean
          badge_color?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          height_px?: number
          id?: string
          max_active?: number
          name: string
          placement: string
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
          width_px?: number
        }
        Update: {
          active?: boolean
          badge_color?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          height_px?: number
          id?: string
          max_active?: number
          name?: string
          placement?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
          width_px?: number
        }
        Relationships: []
      }
      area_guides: {
        Row: {
          attractions: string | null
          average_prices: string | null
          county: string | null
          created_at: string
          faqs: Json
          hero_image: string | null
          hospitals: string | null
          id: string
          internet: string | null
          level: string
          lifestyle: string | null
          market_overview: string | null
          name: string
          overview: string | null
          published: boolean
          schools: string | null
          security: string | null
          shopping: string | null
          slug: string
          town: string | null
          transport: string | null
          updated_at: string
          utilities: string | null
        }
        Insert: {
          attractions?: string | null
          average_prices?: string | null
          county?: string | null
          created_at?: string
          faqs?: Json
          hero_image?: string | null
          hospitals?: string | null
          id?: string
          internet?: string | null
          level?: string
          lifestyle?: string | null
          market_overview?: string | null
          name: string
          overview?: string | null
          published?: boolean
          schools?: string | null
          security?: string | null
          shopping?: string | null
          slug: string
          town?: string | null
          transport?: string | null
          updated_at?: string
          utilities?: string | null
        }
        Update: {
          attractions?: string | null
          average_prices?: string | null
          county?: string | null
          created_at?: string
          faqs?: Json
          hero_image?: string | null
          hospitals?: string | null
          id?: string
          internet?: string | null
          level?: string
          lifestyle?: string | null
          market_overview?: string | null
          name?: string
          overview?: string | null
          published?: boolean
          schools?: string | null
          security?: string | null
          shopping?: string | null
          slug?: string
          town?: string | null
          transport?: string | null
          updated_at?: string
          utilities?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          summary: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          summary?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          summary?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
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
      blog_packages: {
        Row: {
          active: boolean
          badge_color: string | null
          created_at: string
          description: string | null
          duration_days: number
          features: Json
          homepage_placement: boolean
          id: string
          is_featured: boolean
          is_sponsored: boolean
          name: string
          price: number
          priority_placement: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_color?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json
          homepage_placement?: boolean
          id?: string
          is_featured?: boolean
          is_sponsored?: boolean
          name: string
          price?: number
          priority_placement?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_color?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json
          homepage_placement?: boolean
          id?: string
          is_featured?: boolean
          is_sponsored?: boolean
          name?: string
          price?: number
          priority_placement?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_purchases: {
        Row: {
          activated_at: string | null
          amount_paid: number
          created_at: string
          expires_at: string | null
          id: string
          mpesa_transaction_id: string | null
          package_id: string | null
          pending_package_id: string | null
          post_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          amount_paid?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          mpesa_transaction_id?: string | null
          package_id?: string | null
          pending_package_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          amount_paid?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          mpesa_transaction_id?: string | null
          package_id?: string | null
          pending_package_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_purchases_mpesa_transaction_id_fkey"
            columns: ["mpesa_transaction_id"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "blog_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_purchases_pending_package_id_fkey"
            columns: ["pending_package_id"]
            isOneToOne: false
            referencedRelation: "blog_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_purchases_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          admin_notes: string | null
          author_id: string | null
          category: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          expires_at: string | null
          id: string
          is_sponsored: boolean
          package_id: string | null
          plagiarism_checked_at: string | null
          plagiarism_report: Json | null
          plagiarism_score: number | null
          published_at: string | null
          reading_minutes: number
          reviewed_at: string | null
          reviewed_by: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          submitted_at: string | null
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          admin_notes?: string | null
          author_id?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          expires_at?: string | null
          id?: string
          is_sponsored?: boolean
          package_id?: string | null
          plagiarism_checked_at?: string | null
          plagiarism_report?: Json | null
          plagiarism_score?: number | null
          published_at?: string | null
          reading_minutes?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          submitted_at?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          admin_notes?: string | null
          author_id?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          expires_at?: string | null
          id?: string
          is_sponsored?: boolean
          package_id?: string | null
          plagiarism_checked_at?: string | null
          plagiarism_report?: Json | null
          plagiarism_score?: number | null
          published_at?: string | null
          reading_minutes?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          submitted_at?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "blog_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_checklist_progress: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          id: string
          notes: string | null
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          notes?: string | null
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          notes?: string | null
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_checklist_progress_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "buyer_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_checklist_templates: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string | null
          sender_role: string
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role?: string
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      due_diligence_requests: {
        Row: {
          admin_notes: string | null
          county: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          property_ref: string | null
          service: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          county?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          property_ref?: string | null
          service: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          county?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          property_ref?: string | null
          service?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faq_analytics_events: {
        Row: {
          category: string | null
          created_at: string
          event_type: string
          id: string
          link_href: string | null
          path: string | null
          question_id: string | null
          search_term: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_type: string
          id?: string
          link_href?: string | null
          path?: string | null
          question_id?: string | null
          search_term?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_type?: string
          id?: string
          link_href?: string | null
          path?: string | null
          question_id?: string | null
          search_term?: string | null
          user_id?: string | null
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
      investment_factors: {
        Row: {
          active: boolean
          created_at: string
          explanation: string | null
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          explanation?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          explanation?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          business_permit_url: string | null
          company_name: string | null
          created_at: string
          earb_license_number: string | null
          earb_license_url: string | null
          full_legal_name: string
          id: string
          id_document_url: string
          id_number: string
          id_type: string
          kra_pin: string | null
          kra_pin_certificate_url: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_permit_url?: string | null
          company_name?: string | null
          created_at?: string
          earb_license_number?: string | null
          earb_license_url?: string | null
          full_legal_name: string
          id?: string
          id_document_url: string
          id_number: string
          id_type?: string
          kra_pin?: string | null
          kra_pin_certificate_url?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_permit_url?: string | null
          company_name?: string | null
          created_at?: string
          earb_license_number?: string | null
          earb_license_url?: string | null
          full_legal_name?: string
          id?: string
          id_document_url?: string
          id_number?: string
          id_type?: string
          kra_pin?: string | null
          kra_pin_certificate_url?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id?: string
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
      listing_packages: {
        Row: {
          active: boolean
          analytics_enabled: boolean
          auto_expiry: boolean
          badge_color: string | null
          category_highlight: boolean
          created_at: string
          description: string | null
          duration_days: number
          homepage_placement: boolean
          id: string
          is_featured: boolean
          lead_management: boolean
          max_listings: number
          max_photos: number
          max_videos: number
          name: string
          price: number
          priority_search: boolean
          renewal_enabled: boolean
          slug: string
          sort_order: number
          updated_at: string
          whatsapp_button: boolean
        }
        Insert: {
          active?: boolean
          analytics_enabled?: boolean
          auto_expiry?: boolean
          badge_color?: string | null
          category_highlight?: boolean
          created_at?: string
          description?: string | null
          duration_days?: number
          homepage_placement?: boolean
          id?: string
          is_featured?: boolean
          lead_management?: boolean
          max_listings?: number
          max_photos?: number
          max_videos?: number
          name: string
          price?: number
          priority_search?: boolean
          renewal_enabled?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
          whatsapp_button?: boolean
        }
        Update: {
          active?: boolean
          analytics_enabled?: boolean
          auto_expiry?: boolean
          badge_color?: string | null
          category_highlight?: boolean
          created_at?: string
          description?: string | null
          duration_days?: number
          homepage_placement?: boolean
          id?: string
          is_featured?: boolean
          lead_management?: boolean
          max_listings?: number
          max_photos?: number
          max_videos?: number
          name?: string
          price?: number
          priority_search?: boolean
          renewal_enabled?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
          whatsapp_button?: boolean
        }
        Relationships: []
      }
      match_preferences: {
        Row: {
          created_at: string
          id: string
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mpesa_transactions: {
        Row: {
          ad_campaign_id: string | null
          amount: number
          blog_post_id: string | null
          checkout_request_id: string | null
          created_at: string
          duration_days: number | null
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          package_id: string | null
          phone_number: string
          property_id: string | null
          purpose: Database["public"]["Enums"]["mpesa_purpose"]
          raw_callback: Json | null
          result_code: number | null
          result_desc: string | null
          status: Database["public"]["Enums"]["mpesa_status"]
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_campaign_id?: string | null
          amount: number
          blog_post_id?: string | null
          checkout_request_id?: string | null
          created_at?: string
          duration_days?: number | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          package_id?: string | null
          phone_number: string
          property_id?: string | null
          purpose: Database["public"]["Enums"]["mpesa_purpose"]
          raw_callback?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: Database["public"]["Enums"]["mpesa_status"]
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_campaign_id?: string | null
          amount?: number
          blog_post_id?: string | null
          checkout_request_id?: string | null
          created_at?: string
          duration_days?: number | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          package_id?: string | null
          phone_number?: string
          property_id?: string | null
          purpose?: Database["public"]["Enums"]["mpesa_purpose"]
          raw_callback?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: Database["public"]["Enums"]["mpesa_status"]
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_transactions_ad_campaign_id_fkey"
            columns: ["ad_campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mpesa_transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "listing_packages"
            referencedColumns: ["id"]
          },
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
      phone_verifications: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          sent_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          sent_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          sent_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line: string | null
          agent_verification_id_url: string | null
          agent_verification_license_url: string | null
          agent_verification_requested_at: string | null
          agent_verification_reviewed_at: string | null
          agent_verification_reviewed_by: string | null
          agent_verification_reviewer_notes: string | null
          agent_verification_status: string
          avatar_url: string | null
          bio: string | null
          comp_granted_at: string | null
          comp_granted_by: string | null
          comp_reason: string | null
          company_name: string | null
          county: string | null
          created_at: string
          email_public: string | null
          facebook_url: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at: string | null
          languages: string[]
          last_expiry_reminder_days: number | null
          license_number: string | null
          linkedin_url: string | null
          listing_quota: number
          office_hours: string | null
          pending_tier: string | null
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          profile_completed_at: string | null
          referral_code: string | null
          referred_by: string | null
          role_primary: string | null
          service_areas: string[]
          services: string[]
          specialties: string[]
          subscription_started_at: string | null
          subscription_suspended: boolean
          tier: string
          tier_expires_at: string | null
          tiktok_url: string | null
          tos_accepted_at: string | null
          tos_version_accepted: string | null
          town: string | null
          twitter_url: string | null
          updated_at: string
          verification_sub_expires_at: string | null
          verification_sub_started_at: string | null
          verified: boolean
          website: string | null
          whatsapp: string | null
          years_experience: number | null
        }
        Insert: {
          address_line?: string | null
          agent_verification_id_url?: string | null
          agent_verification_license_url?: string | null
          agent_verification_requested_at?: string | null
          agent_verification_reviewed_at?: string | null
          agent_verification_reviewed_by?: string | null
          agent_verification_reviewer_notes?: string | null
          agent_verification_status?: string
          avatar_url?: string | null
          bio?: string | null
          comp_granted_at?: string | null
          comp_granted_by?: string | null
          comp_reason?: string | null
          company_name?: string | null
          county?: string | null
          created_at?: string
          email_public?: string | null
          facebook_url?: string | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at?: string | null
          languages?: string[]
          last_expiry_reminder_days?: number | null
          license_number?: string | null
          linkedin_url?: string | null
          listing_quota?: number
          office_hours?: string | null
          pending_tier?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          profile_completed_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role_primary?: string | null
          service_areas?: string[]
          services?: string[]
          specialties?: string[]
          subscription_started_at?: string | null
          subscription_suspended?: boolean
          tier?: string
          tier_expires_at?: string | null
          tiktok_url?: string | null
          tos_accepted_at?: string | null
          tos_version_accepted?: string | null
          town?: string | null
          twitter_url?: string | null
          updated_at?: string
          verification_sub_expires_at?: string | null
          verification_sub_started_at?: string | null
          verified?: boolean
          website?: string | null
          whatsapp?: string | null
          years_experience?: number | null
        }
        Update: {
          address_line?: string | null
          agent_verification_id_url?: string | null
          agent_verification_license_url?: string | null
          agent_verification_requested_at?: string | null
          agent_verification_reviewed_at?: string | null
          agent_verification_reviewed_by?: string | null
          agent_verification_reviewer_notes?: string | null
          agent_verification_status?: string
          avatar_url?: string | null
          bio?: string | null
          comp_granted_at?: string | null
          comp_granted_by?: string | null
          comp_reason?: string | null
          company_name?: string | null
          county?: string | null
          created_at?: string
          email_public?: string | null
          facebook_url?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at?: string | null
          languages?: string[]
          last_expiry_reminder_days?: number | null
          license_number?: string | null
          linkedin_url?: string | null
          listing_quota?: number
          office_hours?: string | null
          pending_tier?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          profile_completed_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role_primary?: string | null
          service_areas?: string[]
          services?: string[]
          specialties?: string[]
          subscription_started_at?: string | null
          subscription_suspended?: boolean
          tier?: string
          tier_expires_at?: string | null
          tiktok_url?: string | null
          tos_accepted_at?: string | null
          tos_version_accepted?: string | null
          town?: string | null
          twitter_url?: string | null
          updated_at?: string
          verification_sub_expires_at?: string | null
          verification_sub_started_at?: string | null
          verified?: boolean
          website?: string | null
          whatsapp?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          investment_note: string | null
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
          tour_url: string | null
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
          investment_note?: string | null
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
          tour_url?: string | null
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
          investment_note?: string | null
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
          tour_url?: string | null
          town?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      property_alerts: {
        Row: {
          active: boolean
          created_at: string
          filters: Json
          id: string
          last_notified_at: string | null
          name: string
          notify_email: boolean
          notify_in_app: boolean
          on_agent_new_listing: boolean
          on_new_match: boolean
          on_price_drop: boolean
          on_relisted: boolean
          on_status_change: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string | null
          name?: string
          notify_email?: boolean
          notify_in_app?: boolean
          on_agent_new_listing?: boolean
          on_new_match?: boolean
          on_price_drop?: boolean
          on_relisted?: boolean
          on_status_change?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string | null
          name?: string
          notify_email?: boolean
          notify_in_app?: boolean
          on_agent_new_listing?: boolean
          on_new_match?: boolean
          on_price_drop?: boolean
          on_relisted?: boolean
          on_status_change?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string | null
          id: string
          metadata: Json | null
          property_id: string
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          property_id: string
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          property_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_image_hashes: {
        Row: {
          created_at: string
          id: string
          image_hash: string
          image_url: string | null
          owner_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_hash: string
          image_url?: string | null
          owner_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_hash?: string
          image_url?: string | null
          owner_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_image_hashes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_investment_ratings: {
        Row: {
          created_at: string
          factor_key: string
          id: string
          property_id: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          factor_key: string
          id?: string
          property_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          factor_key?: string
          id?: string
          property_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_investment_ratings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_package_purchases: {
        Row: {
          activated_at: string | null
          amount_paid: number
          created_at: string
          expires_at: string | null
          id: string
          mpesa_transaction_id: string | null
          owner_id: string
          package_id: string
          pending_package_id: string | null
          property_id: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          amount_paid?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          mpesa_transaction_id?: string | null
          owner_id: string
          package_id: string
          pending_package_id?: string | null
          property_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          amount_paid?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          mpesa_transaction_id?: string | null
          owner_id?: string
          package_id?: string
          pending_package_id?: string | null
          property_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_package_purchases_mpesa_transaction_id_fkey"
            columns: ["mpesa_transaction_id"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_package_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "listing_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_package_purchases_pending_package_id_fkey"
            columns: ["pending_package_id"]
            isOneToOne: false
            referencedRelation: "listing_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_package_purchases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_verification_checks: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          criterion_key: string
          id: string
          notes: string | null
          passed: boolean
          property_id: string
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          criterion_key: string
          id?: string
          notes?: string | null
          passed?: boolean
          property_id: string
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          criterion_key?: string
          id?: string
          notes?: string | null
          passed?: boolean
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_verification_checks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      pwa_install_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          platform: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          platform?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          platform?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          bucket: string
          hit_at: string
          id: string
          key: string
        }
        Insert: {
          bucket: string
          hit_at?: string
          id?: string
          key: string
        }
        Update: {
          bucket?: string
          hit_at?: string
          id?: string
          key?: string
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
      scan_runs: {
        Row: {
          duration_ms: number
          error_message: string | null
          error_step: string | null
          id: string
          ok: boolean
          ran_at: string
          reminders_sent: number
          triggered_by: string
        }
        Insert: {
          duration_ms?: number
          error_message?: string | null
          error_step?: string | null
          id?: string
          ok: boolean
          ran_at?: string
          reminders_sent?: number
          triggered_by?: string
        }
        Update: {
          duration_ms?: number
          error_message?: string | null
          error_step?: string | null
          id?: string
          ok?: boolean
          ran_at?: string
          reminders_sent?: number
          triggered_by?: string
        }
        Relationships: []
      }
      support_click_events: {
        Row: {
          action: string
          context: string
          created_at: string
          id: string
          page_path: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          context?: string
          created_at?: string
          id?: string
          page_path?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          context?: string
          created_at?: string
          id?: string
          page_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          body: string
          category: string
          created_at: string
          id: string
          priority: string
          resolved_at: string | null
          screenshot_path: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          body: string
          category?: string
          created_at?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          screenshot_path?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          body?: string
          category?: string
          created_at?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          screenshot_path?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tier_plans: {
        Row: {
          active: boolean
          badge_color: string | null
          created_at: string
          duration_days: number
          highlight: boolean
          id: string
          listing_quota: number
          name: string
          perks: Json
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_color?: string | null
          created_at?: string
          duration_days?: number
          highlight?: boolean
          id?: string
          listing_quota?: number
          name: string
          perks?: Json
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_color?: string | null
          created_at?: string
          duration_days?: number
          highlight?: boolean
          id?: string
          listing_quota?: number
          name?: string
          perks?: Json
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
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
      verification_criteria: {
        Row: {
          active: boolean
          created_at: string
          explanation: string | null
          id: string
          key: string
          label: string
          land_only: boolean
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          explanation?: string | null
          id?: string
          key: string
          label: string
          land_only?: boolean
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          explanation?: string | null
          id?: string
          key?: string
          label?: string
          land_only?: boolean
          sort_order?: number
          updated_at?: string
          weight?: number
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
      agent_performance: { Args: { _agent_id: string }; Returns: Json }
      bump_ad_daily_stat: {
        Args: { _campaign: string; _kind: string }
        Returns: undefined
      }
      check_and_hit_rate_limit: {
        Args: {
          _bucket: string
          _key: string
          _limit: number
          _window_seconds: number
        }
        Returns: boolean
      }
      claim_referral: { Args: { _code: string }; Returns: boolean }
      expire_listing_packages: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_profile_complete: {
        Args: { _p: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: boolean
      }
      property_investment_score: {
        Args: { _property_id: string }
        Returns: number
      }
      property_verification_score: {
        Args: { _property_id: string }
        Returns: {
          earned: number
          score: number
          total: number
        }[]
      }
      run_saved_search_alerts: { Args: never; Returns: number }
      send_subscription_reminders: { Args: never; Returns: number }
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
      kyc_status: "none" | "pending" | "approved" | "rejected"
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
        | "listing_package"
        | "advertisement"
        | "blog_submission"
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
      kyc_status: ["none", "pending", "approved", "rejected"],
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
        "listing_package",
        "advertisement",
        "blog_submission",
      ],
      mpesa_status: ["pending", "success", "failed", "cancelled"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
