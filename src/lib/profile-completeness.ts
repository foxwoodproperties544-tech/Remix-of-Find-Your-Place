/**
 * Mirrors the database function public.is_profile_complete(profiles) so the UI
 * can tell an agent exactly which fields are still missing instead of showing a
 * vague "complete your profile" banner.
 */
export type ProfileLike = {
  full_name?: string | null;
  bio?: string | null;
  phone?: string | null;
  phone_verified?: boolean | null;
  county?: string | null;
  town?: string | null;
  services?: string[] | null;
  service_areas?: string[] | null;
};

export const PROFILE_COMPLETENESS_COLUMNS =
  "full_name, bio, phone, phone_verified, county, town, services, service_areas, profile_completed_at";

const len = (v?: string | null) => (v ?? "").trim().length;

export function missingProfileFields(p: ProfileLike | null | undefined): string[] {
  if (!p) return ["Your profile details"];
  const missing: string[] = [];
  if (len(p.full_name) <= 1) missing.push("Full name");
  if (len(p.bio) < 60) missing.push(`About you / bio (at least 60 characters — ${len(p.bio)} so far)`);
  if (len(p.phone) <= 6) missing.push("Phone number");
  else if (!p.phone_verified) missing.push("Save your phone number to confirm it");
  if (len(p.county) <= 1) missing.push("County you are based in");
  if (len(p.town) <= 1) missing.push("Town / area you are based in");
  if (!(p.services?.length)) missing.push("At least one service you offer");
  if (!(p.service_areas?.length)) missing.push("At least one service area you cover");
  return missing;
}

export function isProfileComplete(p: ProfileLike | null | undefined): boolean {
  return missingProfileFields(p).length === 0;
}
