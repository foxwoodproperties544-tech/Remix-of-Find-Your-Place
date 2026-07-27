-- 1. Property package purchases: admin-only updates
DROP POLICY IF EXISTS ppp_admin_update ON public.property_package_purchases;
CREATE POLICY ppp_admin_update ON public.property_package_purchases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Properties: block owner writes to verification/featured columns
CREATE OR REPLACE FUNCTION public.guard_property_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.verified := OLD.verified;
  NEW.verified_at := OLD.verified_at;
  NEW.verified_by := OLD.verified_by;
  NEW.featured := OLD.featured;
  NEW.is_featured := OLD.is_featured;
  NEW.featured_until := OLD.featured_until;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_property_privileged_columns ON public.properties;
CREATE TRIGGER trg_guard_property_privileged_columns
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.guard_property_privileged_columns();

-- 3. Profiles: block self-elevation
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.verified := OLD.verified;
  NEW.agent_verification_status := OLD.agent_verification_status;
  NEW.kyc_status := OLD.kyc_status;
  NEW.kyc_verified_at := OLD.kyc_verified_at;
  NEW.tier := OLD.tier;
  NEW.pending_tier := OLD.pending_tier;
  NEW.tier_expires_at := OLD.tier_expires_at;
  NEW.listing_quota := OLD.listing_quota;
  NEW.role_primary := OLD.role_primary;
  NEW.comp_reason := OLD.comp_reason;
  NEW.comp_granted_at := OLD.comp_granted_at;
  NEW.verification_sub_expires_at := OLD.verification_sub_expires_at;
  NEW.subscription_suspended := OLD.subscription_suspended;
  NEW.subscription_started_at := OLD.subscription_started_at;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- 4. Ad campaigns: owners cannot self-activate or change money/dates
CREATE OR REPLACE FUNCTION public.guard_ad_campaign_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.amount_paid := OLD.amount_paid;
  NEW.mpesa_transaction_id := OLD.mpesa_transaction_id;
  NEW.starts_at := OLD.starts_at;
  NEW.expires_at := OLD.expires_at;
  NEW.package_id := OLD.package_id;
  NEW.impressions := OLD.impressions;
  NEW.clicks := OLD.clicks;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      NEW.status IN ('paused','cancelled')
      OR (NEW.status = 'active' AND OLD.status = 'paused')
    ) THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_ad_campaign_columns ON public.ad_campaigns;
CREATE TRIGGER trg_guard_ad_campaign_columns
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.guard_ad_campaign_columns();

-- 5. Blog posts: authors cannot self-publish or self-sponsor
CREATE OR REPLACE FUNCTION public.guard_blog_post_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.is_sponsored := OLD.is_sponsored;
  NEW.published_at := OLD.published_at;
  NEW.expires_at := OLD.expires_at;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.admin_notes := OLD.admin_notes;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('draft','pending_review') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_blog_post_columns ON public.blog_posts;
CREATE TRIGGER trg_guard_blog_post_columns
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_blog_post_columns();

REVOKE EXECUTE ON FUNCTION public.guard_property_privileged_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_privileged_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_ad_campaign_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_blog_post_columns() FROM anon, authenticated;