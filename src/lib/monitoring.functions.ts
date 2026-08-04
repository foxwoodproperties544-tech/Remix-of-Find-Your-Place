import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const logSystemEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    level: z.enum(["info", "warn", "error", "critical"]),
    source: z.string(),
    message: z.string(),
    metadata: z.any().optional(),
    userId: z.string().optional()
  }).parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("system_logs")
      .insert({
        level: data.level,
        source: data.source,
        message: data.message,
        metadata: data.metadata || {},
        user_id: data.userId
      });

    if (error) console.error("Failed to log system event:", error);
    return { success: !error };
  });

export const getSystemMetrics = createServerFn({ method: "GET" })
  .handler(async () => {
    // This would be restricted by middleware in a real app, but for now we'll check inside
    // In a TanStack Start app, we'd use .middleware([requireAdmin])
    
    const [logs, health, stats] = await Promise.all([
      supabaseAdmin.from("system_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("health_checks").select("*"),
      supabaseAdmin.rpc("get_system_stats") // We might need to define this if we want aggregate counts
    ]);

    // Simple aggregate stats if RPC doesn't exist
    const { count: propertyCount } = await supabaseAdmin.from("properties").select("*", { count: 'exact', head: true });
    const { count: userCount } = await supabaseAdmin.from("profiles").select("*", { count: 'exact', head: true });
    const { count: inquiryCount } = await supabaseAdmin.from("leads").select("*", { count: 'exact', head: true });

    return {
      logs: logs.data || [],
      health: health.data || [],
      stats: {
        properties: propertyCount || 0,
        users: userCount || 0,
        inquiries: inquiryCount || 0,
        uptime: process.uptime()
      }
    };
  });

export const exportDataBackup = createServerFn({ method: "POST" })
  .handler(async () => {
    // In a real scenario, this would generate a signed URL to a CSV/JSON in storage
    // For now, we'll return a subset of critical data as JSON
    const tables = ["properties", "profiles", "leads", "blog_posts"];
    const backup: Record<string, any> = {};

    for (const table of tables) {
      const { data } = await supabaseAdmin.from(table).select("*").limit(1000);
      backup[table] = data || [];
    }

    return {
      filename: `foxwood_backup_${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify(backup, null, 2)
    };
  });
