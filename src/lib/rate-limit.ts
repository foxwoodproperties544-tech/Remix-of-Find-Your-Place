import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side rate-limit check. Calls the SECURITY DEFINER RPC that
 * both records the hit and returns whether the caller is under the limit.
 *
 * Returns true when the submission is allowed, false when throttled.
 * Fails open on network errors — never blocks a legit user if the RPC fails.
 */
export async function checkRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_and_hit_rate_limit", {
      _bucket: bucket,
      _key: key,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** Build a stable per-caller key. Prefer user id; fall back to a persistent browser fingerprint. */
export function rateLimitKey(userId: string | null | undefined): string {
  if (userId) return `u:${userId}`;
  try {
    const k = "fx_rl_anon";
    let v = localStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(k, v);
    }
    return `a:${v}`;
  } catch {
    return `a:unknown`;
  }
}
