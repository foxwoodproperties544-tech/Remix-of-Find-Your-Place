import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function rateLimit(context: any, bucket: string, limit: number, windowSeconds: number) {
  const { data, error } = await context.supabase.rpc("check_and_hit_rate_limit", {
    _bucket: bucket,
    _key: `u:${context.userId}`,
    _limit: limit,
    _window_seconds: windowSeconds,
  });
  if (error) return;
  if (data === false) throw new Error("Too many messages — please slow down and try again shortly.");
}

/** Start (or reuse) a private thread between the signed-in buyer and a listing's agent. */
export const startConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        propertyId: z.string().uuid(),
        body: z.string().trim().min(1).max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await rateLimit(context, "conversation_start", 15, 3600);

    const { data: property, error: pErr } = await context.supabase
      .from("properties")
      .select("id, title, owner_id, status")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!property || property.status !== "published") throw new Error("Listing not available");
    if (!property.owner_id) throw new Error("This listing has no agent to message");
    if (property.owner_id === context.userId) throw new Error("You cannot message your own listing");

    const { data: existing } = await context.supabase
      .from("conversations")
      .select("id")
      .eq("property_id", property.id)
      .eq("buyer_id", context.userId)
      .eq("agent_id", property.owner_id)
      .maybeSingle();

    let conversationId = (existing as any)?.id as string | undefined;

    if (!conversationId) {
      const { data: created, error } = await context.supabase
        .from("conversations")
        .insert({
          property_id: property.id,
          buyer_id: context.userId,
          agent_id: property.owner_id,
          subject: property.title,
        })
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      conversationId = (created as any)?.id;
    }

    const { error: mErr } = await context.supabase
      .from("conversation_messages")
      .insert({ conversation_id: conversationId, sender_id: context.userId, body: data.body });
    if (mErr) throw new Error(mErr.message);

    return { ok: true, conversationId };
  });

/** Post a message into an existing thread (participants only, enforced by RLS). */
export const sendConversationMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        body: z.string().trim().max(4000).optional(),
        attachments: z.array(z.string().trim().url().max(600)).max(5).optional(),
      })
      .refine((v) => !!v.body?.length || !!v.attachments?.length, {
        message: "Write a message or attach a link",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await rateLimit(context, "conversation_message", 60, 300);

    const { error } = await context.supabase.from("conversation_messages").insert({
      conversation_id: data.conversationId,
      sender_id: context.userId,
      body: data.body ?? null,
      attachments: data.attachments ?? [],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Mark the other party's messages in a thread as read. */
export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversation_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .is("read_at", null)
      .neq("sender_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
