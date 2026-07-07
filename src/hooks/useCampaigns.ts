import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Campaign {
  id: string;
  name: string;
  targetType: 'profile' | 'mix' | 'battle';
  targetId?: string | null;
  status: 'pending_payment' | 'active' | 'paused' | 'rejected' | 'completed';
  budget: number;
  currency: string;
  reachScore: number;
  impressions: number;
  clicks: number;
  ctr: number;
  creativeImageUrl?: string | null;
  ctaUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignTargets {
  profile: { id: string; name: string; avatar?: string };
  mixes: { id: string; title: string; coverImage?: string }[];
  battles: { id: string; title: string }[];
}

export interface CreateCampaignInput {
  name: string;
  targetType: 'profile' | 'mix' | 'battle';
  targetId?: string;
  budget: number;
  currency?: string;
  ctaUrl?: string;
  startDate?: string;
  endDate?: string;
  creativeImage?: File;
}

export function useMyCampaigns() {
  return useQuery<Campaign[]>({
    queryKey: ['myCampaigns'],
    queryFn: async () => {
      const res = await api.get('/campaigns/me');
      return res.data.data;
    },
  });
}

export function useCampaignTargets() {
  return useQuery<CampaignTargets>({
    queryKey: ['campaignTargets'],
    queryFn: async () => {
      const res = await api.get('/campaigns/me/targets');
      return res.data.data;
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCampaignInput) => {
      const formData = new FormData();
      formData.append('name', payload.name);
      formData.append('targetType', payload.targetType);
      if (payload.targetId) formData.append('targetId', payload.targetId);
      formData.append('budget', String(payload.budget));
      if (payload.currency) formData.append('currency', payload.currency);
      if (payload.ctaUrl) formData.append('ctaUrl', payload.ctaUrl);
      if (payload.startDate) formData.append('startDate', payload.startDate);
      if (payload.endDate) formData.append('endDate', payload.endDate);
      if (payload.creativeImage) formData.append('creativeImage', payload.creativeImage);
      const res = await api.post('/campaigns', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCampaigns'] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/campaigns/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCampaigns'] });
    },
  });
}
