import { useState } from 'react';
import {
  Loader2,
  Megaphone,
  Plus,
  Trash2,
  ImageIcon,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMyCampaigns,
  useCampaignTargets,
  useCreateCampaign,
  useDeleteCampaign,
} from '@/hooks/useCampaigns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-500/10 text-yellow-500',
  active: 'bg-green/10 text-green',
  paused: 'bg-orange-500/10 text-orange-500',
  rejected: 'bg-red/10 text-red',
  completed: 'bg-blue-500/10 text-blue-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  active: 'Active',
  paused: 'Paused',
  rejected: 'Rejected',
  completed: 'Completed',
};

export default function Campaigns() {
  const { data: campaigns, isLoading, error } = useMyCampaigns();
  const { data: targets } = useCampaignTargets();
  const createMutation = useCreateCampaign();
  const deleteMutation = useDeleteCampaign();
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    targetType: 'profile' as 'profile' | 'mix' | 'battle',
    targetId: '',
    budget: '100',
    currency: 'SLE',
    ctaUrl: '',
    startDate: '',
    endDate: '',
    creativeImage: null as File | null,
  });

  const targetOptions =
    form.targetType === 'profile'
      ? targets?.profile
        ? [{ id: targets.profile.id, label: targets.profile.name }]
        : []
      : form.targetType === 'mix'
      ? targets?.mixes.map((m) => ({ id: m.id, label: m.title })) || []
      : targets?.battles.map((b) => ({ id: b.id, label: b.title })) || [];

  const handleImageChange = (file: File | null) => {
    setForm((prev) => ({ ...prev, creativeImage: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      targetType: 'profile',
      targetId: '',
      budget: '100',
      currency: 'SLE',
      ctaUrl: '',
      startDate: '',
      endDate: '',
      creativeImage: null,
    });
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const budget = Number(form.budget);
    if (!form.name || budget < 100) {
      toast.error('Campaign name and minimum budget of SLE 100 are required');
      return;
    }

    createMutation.mutate(
      {
        name: form.name,
        targetType: form.targetType,
        targetId: form.targetId,
        budget,
        currency: form.currency,
        ctaUrl: form.ctaUrl,
        startDate: form.startDate,
        endDate: form.endDate,
        creativeImage: form.creativeImage || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Campaign created and awaiting admin approval');
          resetForm();
          setOpen(false);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error || 'Failed to create campaign');
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Campaign deleted'),
      onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete campaign'),
    });
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Promotions
          </h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold-gradient text-black hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black-surface border-dark-gray text-text-primary max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-display uppercase tracking-wide">
                Create Promotion Campaign
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label className="text-text-secondary mb-2 block">Campaign Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. New Single Push"
                  className="bg-black-elevated border-dark-gray text-text-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Promote</Label>
                  <Select
                    value={form.targetType}
                    onValueChange={(v) => setForm({ ...form, targetType: v as any, targetId: '' })}
                  >
                    <SelectTrigger className="bg-black-elevated border-dark-gray text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black-surface border-dark-gray">
                      <SelectItem value="profile">My Profile</SelectItem>
                      <SelectItem value="mix">A Mix</SelectItem>
                      <SelectItem value="battle">A Battle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Target</Label>
                  <Select
                    value={form.targetId}
                    onValueChange={(v) => setForm({ ...form, targetId: v })}
                    disabled={targetOptions.length === 0}
                  >
                    <SelectTrigger className="bg-black-elevated border-dark-gray text-text-primary">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent className="bg-black-surface border-dark-gray">
                      {targetOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Budget (SLE)</Label>
                  <Input
                    type="number"
                    min="100"
                    step="1"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                    required
                  />
                  <p className="text-xs text-text-muted mt-1">Min SLE 100</p>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Currency</Label>
                  <Input
                    value={form.currency}
                    disabled
                    className="bg-black-elevated border-dark-gray text-text-primary opacity-70"
                  />
                </div>
              </div>

              <div>
                <Label className="text-text-secondary mb-2 block">CTA Link (optional)</Label>
                <Input
                  value={form.ctaUrl}
                  onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-black-elevated border-dark-gray text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>

              <div>
                <Label className="text-text-secondary mb-2 block">Creative Image</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-black-elevated border border-dashed border-dark-gray flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-text-muted" />
                    )}
                  </div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full bg-gold-gradient text-black font-semibold uppercase hover:opacity-90"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Submit for Approval
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 text-gold animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          Failed to load campaigns
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4">
          {campaigns?.length === 0 && (
            <Card className="bg-black-surface border-dark-gray">
              <CardContent className="p-8 text-center">
                <Megaphone className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">No campaigns yet.</p>
                <p className="text-xs text-text-muted mt-1">
                  Create your first promotion to get more visibility.
                </p>
              </CardContent>
            </Card>
          )}
          {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="bg-black-surface border-dark-gray">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-full md:w-40 h-24 rounded-xl bg-black-elevated border border-dark-gray overflow-hidden flex-shrink-0">
                    {campaign.creativeImageUrl ? (
                      <img
                        src={campaign.creativeImageUrl}
                        alt={campaign.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-text-primary font-semibold">{campaign.name}</h3>
                        <p className="text-xs text-text-muted capitalize">
                          {campaign.targetType} • Budget {campaign.currency} {campaign.budget}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                          STATUS_COLORS[campaign.status]
                        }`}
                      >
                        {STATUS_LABELS[campaign.status]}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="p-2 rounded-lg bg-black-elevated">
                        <p className="text-xs text-text-muted">Reach Score</p>
                        <p className="text-sm font-mono font-semibold text-text-primary">
                          {campaign.reachScore.toFixed(1)}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-black-elevated">
                        <p className="text-xs text-text-muted">Impressions</p>
                        <p className="text-sm font-mono font-semibold text-text-primary">
                          {campaign.impressions.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-black-elevated">
                        <p className="text-xs text-text-muted">Clicks</p>
                        <p className="text-sm font-mono font-semibold text-text-primary">
                          {campaign.clicks.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {campaign.ctaUrl && (
                      <a
                        href={campaign.ctaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gold mt-3 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> CTA Link
                      </a>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2 flex-shrink-0">
                    {campaign.status === 'pending_payment' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-dark-gray text-text-primary hover:text-red hover:border-red"
                        onClick={() => handleDelete(campaign.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-dark-gray text-text-primary"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setAnalyticsOpen(true);
                      }}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Campaign Analytics Modal */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="bg-black-surface border-dark-gray text-text-primary max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-display uppercase tracking-wide flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gold" />
              Campaign Analytics
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-6 mt-2">
              <div>
                <h3 className="text-text-primary font-semibold text-lg">{selectedCampaign.name}</h3>
                <p className="text-xs text-text-muted capitalize">
                  {selectedCampaign.targetType} • Budget {selectedCampaign.currency} {selectedCampaign.budget}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                  <p className="text-xs text-text-muted mb-1">Impressions</p>
                  <p className="text-2xl font-mono font-bold text-text-primary">
                    {selectedCampaign.impressions.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                  <p className="text-xs text-text-muted mb-1">Clicks</p>
                  <p className="text-2xl font-mono font-bold text-text-primary">
                    {selectedCampaign.clicks.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                  <p className="text-xs text-text-muted mb-1">Reach Score</p>
                  <p className="text-2xl font-mono font-bold text-gold">
                    {selectedCampaign.reachScore.toFixed(1)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                  <p className="text-xs text-text-muted mb-1">Click-Through Rate</p>
                  <p className="text-2xl font-mono font-bold text-green">
                    {selectedCampaign.impressions > 0
                      ? ((selectedCampaign.clicks / selectedCampaign.impressions) * 100).toFixed(2)
                      : '0.00'}%
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                <p className="text-xs text-text-muted mb-2">Campaign Status</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${STATUS_COLORS[selectedCampaign.status]}`}>
                    {STATUS_LABELS[selectedCampaign.status]}
                  </span>
                  <span className="text-xs text-text-secondary">
                    Created {new Date(selectedCampaign.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedCampaign.ctaUrl && (
                <a
                  href={selectedCampaign.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-gold hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {selectedCampaign.ctaUrl}
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
