import { useEffect, useState } from 'react';
import { FileText, Settings, Loader2, ShieldCheck, Clock } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ModeratorAuditLogs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p: number) => {
    try {
      setLoading(true);
      const res = await api.get('/moderator/audit-logs', { params: { page: p, limit: 25 } });
      if (res.data.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.meta.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch moderator logs', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black-elevated p-4 sm:p-5 rounded-xl border border-dark-gray">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold" />
            <h2 className="text-base font-bold text-white">Moderator Activity Log</h2>
            <Badge className="bg-gold/20 text-gold border-gold/40 text-[10px]">Super Admin Audited</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Complete historical audit record of all actions taken by Deck Salone Moderators.
          </p>
        </div>
      </div>

      {/* Log Entries List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="bg-black-elevated border-dark-gray p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No audit logs recorded yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="bg-black-elevated border-dark-gray p-4 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-gold/10 text-gold border border-gold/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Settings className="w-3 h-3 animate-spin-slow" />
                    {log.moderatorName || 'Moderator'}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-white border-dark-gray font-mono">
                    {log.action}
                  </Badge>
                  {log.targetType && (
                    <Badge className="bg-dark-gray text-text-secondary text-[10px]">{log.targetType}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {log.targetName && (
                <p className="text-xs font-semibold text-white">Target: {log.targetName}</p>
              )}

              {log.reason && (
                <div className="bg-black-surface p-2.5 rounded border border-dark-gray/60 text-xs text-text-secondary">
                  <span className="text-gold font-semibold">Reason / Audit Note: </span>
                  {log.reason}
                </div>
              )}

              {/* Data Diff */}
              {(log.previousData || log.newData) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  {log.previousData && (
                    <div className="bg-red-950/20 border border-red-500/20 p-2 rounded text-red-200">
                      <span className="font-semibold block text-red-400">Previous Data:</span>
                      <pre className="whitespace-pre-wrap font-mono text-[10px] mt-1">
                        {JSON.stringify(log.previousData, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.newData && (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-2 rounded text-emerald-200">
                      <span className="font-semibold block text-emerald-400">New Data:</span>
                      <pre className="whitespace-pre-wrap font-mono text-[10px] mt-1">
                        {JSON.stringify(log.newData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs px-3 py-1.5 bg-black-surface border border-dark-gray text-white rounded disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-3 py-1.5 bg-black-surface border border-dark-gray text-white rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ModeratorAuditLogs;
