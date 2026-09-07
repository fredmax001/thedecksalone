import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  User,
  Music,
  MessageSquare,
} from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/dateTime';
import { ListSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function ModeratorReports() {
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedLoading(loading);
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Action Modal
  const [actionReport, setActionReport] = useState<any | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('NO_VIOLATION');
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/moderator/reports', { params: { status: statusFilter } });
      if (res.data.success) {
        setReports(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (report: any) => {
    setActionReport(report);
    setSelectedAction('NO_VIOLATION');
    setActionNotes('');
  };

  const handleSaveAction = async () => {
    if (!actionReport) return;
    try {
      setSaving(true);
      await api.post(`/moderator/reports/${actionReport.id}/action`, {
        action: selectedAction,
        notes: actionNotes,
      });
      setActionReport(null);
      fetchReports();
    } catch (err) {
      console.error('Failed to record report action', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black-elevated p-4 sm:p-5 rounded-xl border border-dark-gray">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Community Moderation & Reports</h2>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">Review & Action</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Review user-submitted reports for copyright complaints, duplicate mixes, spam, and policy violations.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black-surface border border-dark-gray text-xs text-white rounded-md px-3 h-9 focus:outline-none focus:border-gold shrink-0"
        >
          <option value="ALL">All Reports</option>
          <option value="PENDING">Pending</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      {/* Reports List */}
      {loading ? (
        showSkeleton ? <ListSkeleton /> : null
      ) : reports.length === 0 ? (
        <Card className="bg-black-elevated border-dark-gray p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No reports pending review</p>
          <p className="text-xs text-text-muted mt-1">All community reports have been reviewed and acted upon.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => (
            <Card key={rep.id} className="bg-black-elevated border-dark-gray p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-dark-gray/60">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      rep.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : rep.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-dark-gray text-text-muted'
                    }`}
                  >
                    {rep.status}
                  </Badge>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{rep.reason}</span>
                  <span className="text-[10px] text-text-muted">• {formatDateTime(rep.createdAt)}</span>
                </div>

                {rep.status === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenAction(rep)}
                    className="bg-gold text-black hover:bg-gold-light text-xs font-semibold h-7 px-3 shrink-0"
                  >
                    Review & Take Action
                  </Button>
                )}
              </div>

              {/* Target Entity Preview */}
              <div className="bg-black-surface p-3 rounded-lg border border-dark-gray/50 space-y-2 text-xs">
                {rep.mix && (
                  <div className="flex items-center gap-3">
                    <Music className="w-4 h-4 text-gold shrink-0" />
                    <div>
                      <p className="font-semibold text-white">Target Mix: {rep.mix.title}</p>
                      <p className="text-[10px] text-text-muted">
                        Status: {rep.mix.isPublic ? 'Published' : 'Hidden'}
                      </p>
                    </div>
                  </div>
                )}

                {rep.targetUser && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-white">Target User: {rep.targetUser.username}</p>
                      <p className="text-[10px] text-text-muted">Account Status: {rep.targetUser.status}</p>
                    </div>
                  </div>
                )}

                {rep.comment && (
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="font-semibold text-white">Target Comment: "{rep.comment.content}"</p>
                  </div>
                )}

                <div className="pt-2 border-t border-dark-gray/40">
                  <p className="text-[11px] font-semibold text-text-secondary">Report Description:</p>
                  <p className="text-xs text-white mt-0.5">{rep.details}</p>
                </div>
              </div>

              {/* Reporter Info */}
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Reported by: {rep.reporter?.username || 'Anonymous User'}</span>
                {rep.actionTaken && <span className="text-emerald-400 font-medium">Action: {rep.actionTaken}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={Boolean(actionReport)} onOpenChange={() => setActionReport(null)}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold text-base font-bold">
              <ShieldAlert className="w-5 h-5" />
              Review Report & Take Action
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Review → Take Action → Record Decision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">Action Decision</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full bg-black-surface border border-dark-gray text-xs text-white rounded-md px-3 h-9 focus:outline-none focus:border-gold"
              >
                <option value="NO_VIOLATION">✅ No Violation (Dismiss Report)</option>
                <option value="WARNING">⚠️ Issue Warning Notification</option>
                <option value="UNPUBLISH">👁️ Hide / Unpublish Content</option>
                <option value="REMOVE_CONTENT">🗑️ Remove Content</option>
                <option value="TEMPORARY_RESTRICTION">🔒 Temporary Restriction</option>
                <option value="ESCALATE_ADMIN">🚨 Escalate to Super Admin</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Moderator Decision Notes / Audit Trail
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Explain the rationale behind this decision..."
                rows={3}
                className="w-full bg-black-surface border border-dark-gray rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActionReport(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAction}
              disabled={saving}
              className="bg-gold text-black hover:bg-gold-light text-xs font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ModeratorReports;