import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getSystemMetrics, exportDataBackup } from '@/lib/monitoring.functions';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  RefreshCw,
  Database,
  Users,
  MessageSquare,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/admin/monitoring')({
  component: MonitoringPage,
});

function MonitoringPage() {
  const fetchMetrics = useServerFn(getSystemMetrics);
  const runBackup = useServerFn(exportDataBackup);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => fetchMetrics(),
    refetchInterval: 30000,
  });

  const backupMutation = useMutation({
    mutationFn: () => runBackup(),
    onSuccess: (res) => {
      const blob = new Blob([res.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported successfully');
    },
    onError: () => toast.error('Failed to export backup'),
  });

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-6">System Monitoring</h1>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  const uptime = data?.stats?.uptime || 0;

  return (
    <DashboardShell>
      <div className="p-8 space-y-6">
        <h1 className="text-2xl font-bold">System Monitoring</h1>
        
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            Real-time infrastructure health and system logs.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => refetch()} 
              disabled={isFetching}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              {backupMutation.isPending ? 'Exporting...' : 'Export Backup'}
            </button>
          </div>
        </div>

        {/* HEALTH STATUS */}
        <div className="grid gap-4 md:grid-cols-3">
          {data?.health?.map((s: any) => (
            <div key={s.service} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize">{s.service}</span>
                {s.status === 'up' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : s.status === 'degraded' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                ) : (
                  <Activity className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${s.status === 'up' ? 'text-emerald-600' : 'text-destructive'}`}>
                  {s.status === 'up' ? 'Healthy' : s.status}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last check: {s.last_check ? formatDistanceToNow(new Date(s.last_check)) : 'never'} ago
              </div>
            </div>
          ))}
        </div>

        {/* KEY STATS */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Live Properties', value: data?.stats?.properties, icon: Database },
            { label: 'Active Users', value: data?.stats?.users, icon: Users },
            { label: 'Total Inquiries', value: data?.stats?.inquiries, icon: MessageSquare },
            { label: 'System Uptime', value: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`, icon: ShieldCheck },
          ].map((st) => (
            <div key={st.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <st.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{st.label}</span>
              </div>
              <div className="mt-1 text-xl font-bold">{st.value ?? 0}</div>
            </div>
          ))}
        </div>

        {/* LOGS */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              System Logs
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Level</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!data?.logs || data.logs.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No recent system logs.
                    </td>
                  </tr>
                ) : (
                  data.logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          log.level === 'critical' ? 'bg-destructive text-white' :
                          log.level === 'error' ? 'bg-destructive/10 text-destructive' :
                          log.level === 'warn' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium text-xs font-mono">{log.source}</td>
                      <td className="px-6 py-3 text-muted-foreground">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
