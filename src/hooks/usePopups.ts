import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PopupType = 'MODAL' | 'BANNER' | 'SHEET';

export interface Popup {
  id: string;
  title: string;
  message: string;
  type: PopupType;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string;
}

export interface PopupPayload {
  title: string;
  message: string;
  type: PopupType;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

// ─── User-facing ───

export function useActivePopups() {
  return useQuery({
    queryKey: ['activePopups'],
    queryFn: async () => {
      const res = await api.get('/popups/active');
      return (res.data?.data || []) as Popup[];
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ─── Admin ───

export function useAdminPopups() {
  return useQuery({
    queryKey: ['adminPopups'],
    queryFn: async () => {
      const res = await api.get('/admin/popups');
      return (res.data?.data || []) as Popup[];
    },
  });
}

export function useCreatePopup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PopupPayload) => {
      const res = await api.post('/admin/popups', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPopups'] });
      queryClient.invalidateQueries({ queryKey: ['activePopups'] });
    },
  });
}

export function useUpdatePopup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PopupPayload> & { id: string }) => {
      const res = await api.put(`/admin/popups/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPopups'] });
      queryClient.invalidateQueries({ queryKey: ['activePopups'] });
    },
  });
}

export function useDeletePopup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/popups/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPopups'] });
      queryClient.invalidateQueries({ queryKey: ['activePopups'] });
    },
  });
}
