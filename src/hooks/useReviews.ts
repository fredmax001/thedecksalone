import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useReviews(djId?: string) {
  return useQuery({
    queryKey: ['reviews', djId],
    queryFn: async () => {
      const url = djId ? `/reviews?djId=${djId}` : '/reviews';
      const res = await api.get(url);
      return res.data.data || [];
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { djId: string; bookingId?: string; rating: number; comment: string }) => {
      const res = await api.post('/reviews', data);
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', vars.djId] });
      queryClient.invalidateQueries({ queryKey: ['dj', vars.djId] });
    },
  });
}
