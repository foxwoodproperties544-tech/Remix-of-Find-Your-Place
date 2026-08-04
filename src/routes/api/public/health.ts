import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const Route = createFileRoute('/api/public/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Check DB connectivity
          const start = Date.now()
          const { data, error } = await supabaseAdmin
            .from('health_checks')
            .select('service, status, last_check')
          
          const latency = Date.now() - start

          if (error) throw error

          const isDegraded = data.some(s => s.status !== 'up')
          
          return new Response(JSON.stringify({
            status: isDegraded ? 'degraded' : 'ok',
            timestamp: new Date().toISOString(),
            latency_ms: latency,
            services: data,
            uptime: process.uptime()
          }), {
            status: isDegraded ? 200 : 200, // Still return 200 for health checks usually, let status body tell the story
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (err: any) {
          return new Response(JSON.stringify({
            status: 'error',
            error: err.message,
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
    }
  }
})
