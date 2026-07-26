import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** A listing is considered stale once it has not been confirmed for this many days. */
export const FRESHNESS_DAYS = 30;

const schema = z.object({
  propertyId: z.string().uuid(),
  stillAvailable: z.boolean().default(true),
});

/**
 * Owner confirms a published listing is still on the market (or marks it as gone).
 * Confirming refreshes the freshness clock; marking it gone unpublishes the listing.
 */
export const confirmListingFreshness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: prop, error: readErr } = await context.supabase
      .from("properties")
      .select("id, owner_id, status")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!prop) throw new Error("Listing not found");
    if (prop.owner_id !== context.userId) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Forbidden");
    }

    const patch: Record<string, unknown> = {
      last_confirmed_at: new Date().toISOString(),
      freshness_reminder_at: null,
    };
    if (!data.stillAvailable) {
      patch.status = "archived";
      patch.is_featured = false;
      patch.featured = false;
    }

    const { error } = await context.supabase.from("properties").update(patch).eq("id", data.propertyId);
    if (error) throw new Error(error.message);

    return { ok: true, stillAvailable: data.stillAvailable };
  });
