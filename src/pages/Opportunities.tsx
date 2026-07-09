import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    MapPin,
    DollarSign,
    CheckCircle,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useUpgradeModalStore } from '@/stores/upgradeModalStore';

interface Opportunity {
    id: string;
    title: string;
    description: string;
    eventType: string;
    eventDate: string;
    eventLocation: string;
    budget: number;
    budgetCurrency: string;
    genres: string[];
    musicStyle?: string;
    hours?: number;
    requirements?: string;
    isFeatured: boolean;
    requiredTier: 'pro' | 'legend';
    status: string;
    userHasApplied: boolean;
    userApplication?: { id: string; status: string };
    applicants?: number;
}

export const Opportunities = () => {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'applied' | 'featured'>('all');
    const [applying, setApplying] = useState<string | null>(null);

    const { tier, checkFeature } = useFeatureAccess();
    const { open } = useUpgradeModalStore();

    // Fetch opportunities
    useEffect(() => {
        const fetchOpportunities = async () => {
            try {
                setLoading(true);
                const res = await api.get('/opportunities');
                setOpportunities(res.data.data || []);
            } catch (err: any) {
                console.error('Failed to load opportunities', err);
                toast.error(err.response?.data?.error || 'Failed to load opportunities');
            } finally {
                setLoading(false);
            }
        };
        fetchOpportunities();
    }, []);

    // Filter opportunities
    const filtered = opportunities.filter((opp) => {
        if (filter === 'applied') return opp.userHasApplied;
        if (filter === 'featured') return opp.isFeatured;
        return true;
    });

    // Apply for opportunity
    const handleApply = async (opp: Opportunity) => {
        // Check tier first
        if (!checkFeature('pro', 'Apply for Opportunities')) {
            return;
        }

        // Check if already applied
        if (opp.userHasApplied) {
            toast.info('You have already applied for this opportunity');
            return;
        }

        if (!checkFeature(opp.requiredTier, 'Apply for Opportunities')) {
            return;
        }

        try {
            setApplying(opp.id);
            const res = await api.post(`/opportunities/${opp.id}/apply`, {
                message: 'Interested in this opportunity',
            });

            if (res.data.success) {
                toast.success('✓ Application sent! Organizer will review your profile.');
                // Update UI
                setOpportunities((prev) =>
                    prev.map((o) =>
                        o.id === opp.id
                            ? { ...o, userHasApplied: true, userApplication: res.data.data }
                            : o
                    )
                );
            }
        } catch (err: any) {
            const error = err.response?.data?.error || 'Failed to apply';
            toast.error(error);
            if (err.response?.status === 403) {
                // Tier error - open modal
                open('Apply for Opportunities', err.response?.data?.requiredTier || 'pro');
            }
        } finally {
            setApplying(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Clock className="w-8 h-8 animate-spin text-gold mx-auto mb-2" />
                    <p className="text-text-secondary">Loading opportunities...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-display font-bold text-text-primary uppercase tracking-wide">
                        DJ Opportunities
                    </h1>
                    <p className="text-text-secondary mt-2">
                        {tier === 'free'
                            ? '📌 Browse available opportunities. Upgrade to Pro to apply and connect with organizers.'
                            : '🎯 Find and apply for DJ gigs, events, and partnerships.'}
                    </p>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    {['all', 'applied', 'featured'].map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? 'default' : 'outline'}
                            onClick={() => setFilter(f as any)}
                            className="capitalize"
                        >
                            {f === 'all'
                                ? `All (${opportunities.length})`
                                : f === 'applied'
                                    ? `Applied (${opportunities.filter((o) => o.userHasApplied).length})`
                                    : `Featured (${opportunities.filter((o) => o.isFeatured).length})`}
                        </Button>
                    ))}
                </div>

                {/* Opportunities List */}
                {filtered.length === 0 ? (
                    <Card className="p-8 text-center border-gold/20">
                        <AlertCircle className="w-8 h-8 text-gold mx-auto mb-3" />
                        <p className="text-text-secondary">
                            {filter === 'applied'
                                ? 'No applications yet. Browse opportunities and apply!'
                                : 'No opportunities available right now. Check back soon!'}
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filtered.map((opp) => (
                            <Card
                                key={opp.id}
                                className={`p-6 border-gold/20 transition-all ${opp.isFeatured ? 'border-gold/50 bg-gold/5' : ''
                                    }`}
                            >
                                <CardContent className="p-0">
                                    {/* Title and Badges */}
                                    <div className="flex justify-between items-start mb-4 gap-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                                                {opp.title}
                                                {opp.isFeatured && (
                                                    <Badge className="bg-gold text-black text-xs">Featured</Badge>
                                                )}
                                            </h3>
                                            <p className="text-text-secondary text-sm mt-1 line-clamp-2">
                                                {opp.description}
                                            </p>
                                        </div>
                                        {opp.userHasApplied && (
                                            <Badge className="bg-green/20 text-green flex-shrink-0">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Applied
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Event Details Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                                                Date
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                                {new Date(opp.eventDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                                                Location
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                                {opp.eventLocation}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                                                Budget
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                                                <DollarSign className="w-4 h-4 flex-shrink-0" />
                                                {opp.budgetCurrency} {opp.budget.toLocaleString()}
                                            </div>
                                        </div>

                                        {opp.hours && (
                                            <div>
                                                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                                                    Duration
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                                                    <Clock className="w-4 h-4 flex-shrink-0" />
                                                    {opp.hours} hours
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {(opp.genres?.length || opp.eventType) && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {opp.eventType && (
                                                <Badge variant="outline" className="text-xs">
                                                    {opp.eventType}
                                                </Badge>
                                            )}
                                            {opp.genres?.map((genre) => (
                                                <Badge key={genre} variant="outline" className="text-xs">
                                                    {genre}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Requirements */}
                                    {opp.requirements && (
                                        <p className="text-sm text-text-secondary bg-black/30 rounded p-3 mb-4">
                                            <span className="font-semibold">Requirements:</span> {opp.requirements}
                                        </p>
                                    )}

                                    {/* CTA Buttons */}
                                    <div className="flex gap-3 justify-between items-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {/* View details */ }}
                                            className="flex-1"
                                        >
                                            View Details
                                        </Button>
                                        <Button
                                            onClick={() => handleApply(opp)}
                                            disabled={
                                                applying === opp.id ||
                                                opp.userHasApplied
                                            }
                                            className={`flex-1 ${opp.userHasApplied
                                                    ? 'bg-green/20 text-green hover:bg-green/30'
                                                    : 'bg-gold-gradient text-black hover:opacity-90'
                                                }`}
                                        >
                                            {opp.userHasApplied ? (
                                                '✓ Applied'
                                            ) : applying === opp.id ? (
                                                'Submitting...'
                                            ) : (
                                                'Apply Now'
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

        </>
    );
};
