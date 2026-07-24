// Server-only audit logging helper. Import only from other .server.ts files
// or lazily via `await import(...)` inside a createServerFn handler.
import { getRequest } from "@tanstack/react-start/server";

export type AuditEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
};

function safeRequestMeta(): { ip: string | null; ua: string | null } {
  try {
    const req = getRequest();
    const h = req?.headers;
    const ip =
      h?.get("cf-connecting-ip") ??
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h?.get("x-real-ip") ??
      null;
    const ua = h?.get("user-agent") ?? null;
    return { ip, ua };
  } catch {
    return { ip: null, ua: null };
  }
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, ua } = safeRequestMeta();
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      summary: entry.summary ?? null,
      before: (entry.before as any) ?? null,
      after: (entry.after as any) ?? null,
      metadata: (entry.metadata as any) ?? null,
      ip_address: ip,
      user_agent: ua,
    });
  } catch (e) {
    // Never let audit failures break the business action.
    console.error("[audit] failed to write entry", e);
  }
}
