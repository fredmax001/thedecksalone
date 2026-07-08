import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BookingData {
  djId: string;
  eventType: string;
  eventDate: string;
  eventLocation: string;
  duration: number;
  budget: number;
  notes?: string;
  requirements?: string;
  eventTypes?: string[];
  musicStyles?: string[];
  equipmentNeeded?: string[];
  budgetMin?: number;
  budgetMax?: number;
  services?: any;
  travelNotes?: string;
}

export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return res.data.data || [];
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BookingData) => {
      const payload = {
        ...data,
        eventDate: new Date(data.eventDate).toISOString(),
      };
      const res = await api.post('/bookings', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
