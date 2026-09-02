import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Loader2, ScanLine } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRequireDj } from '@/hooks/useRequireDj';

interface DJEvent {
  id: string;
  title: string;
  date: string;
  isTicketed: boolean;
}

export default function ScannerLanding() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const djId = user?.djProfile?.id;
  const isDj = useRequireDj();

  useEffect(() => {
    if (!isDj || !djId) {
      setLoading(false);
      return;
    }
    api
      .get(`/events?djId=${djId}&limit=100`)
      .then((res) => {
        if (res.data.success) {
          const list = (res.data.data || []) as DJEvent[];
          const ticketed = list.filter((e) => e.isTicketed);
          if (ticketed.length > 0) {
            ticketed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            navigate(`/dashboard/events/${ticketed[0].id}/scan`, { replace: true });
          } else if (list.length > 0) {
            navigate(`/dashboard/events/${list[0].id}/scan`, { replace: true });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDj, djId, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
        <p className="text-sm font-semibold uppercase tracking-wider text-gold">Activating Camera Scanner...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6 text-center">
      <Card className="bg-black-surface border-dark-gray p-6">
        <CardContent className="space-y-4">
          <ScanLine className="w-16 h-16 text-gold mx-auto" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">No Active Events Found</h2>
          <p className="text-xs text-text-muted">
            Create an event and enable ticket sales to start scanning tickets at the door.
          </p>
          <Link to="/dashboard/events">
            <Button className="w-full bg-gold-gradient text-black font-bold uppercase text-xs mt-2">
              <Calendar className="w-4 h-4 mr-2" /> Go to Events
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
