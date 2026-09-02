import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScanLine, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiErrors';

function extractEventId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Direct ID (cuid or simple id)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && !trimmed.includes('/')) {
    return trimmed;
  }
  // URL like https://decksalone.com/events/xxx or /events/xxx
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/events\/([^/]+)/);
    if (match) return match[1];
  } catch {
    const match = trimmed.match(/\/events\/([^/]+)/);
    if (match) return match[1];
  }
  return null;
}

export default function OnsiteLogin() {
  const { id: urlEventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [eventInput, setEventInput] = useState(urlEventId || '');
  const [username, setUsername] = useState('staff');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eventId = extractEventId(eventInput);
    if (!eventId) {
      toast.error('Please enter a valid event link, ID, or code');
      return;
    }

    if (!username.trim()) {
      toast.error('Please enter staff username');
      return;
    }

    if (!password) {
      toast.error('Please enter the event staff password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post(`/events/${eventId}/ticketing/onsite/auth`, {
        username: username.trim(),
        password,
      });

      if (res.data.success) {
        sessionStorage.setItem(`onsite_token_${eventId}`, res.data.data.token);
        if (res.data.data.staffUsername) {
          sessionStorage.setItem(`onsite_user_${eventId}`, res.data.data.staffUsername);
        }
        toast.success('Access granted');
        navigate(`/events/${eventId}/onsite/tools`);
      } else {
        toast.error(res.data.error || 'Access denied');
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to access event tools. Check username and password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-20 h-20 rounded-2xl bg-[#d3da0c] flex items-center justify-center mb-8 shadow-lg shadow-[#d3da0c]/20">
          <ScanLine className="w-10 h-10 text-black" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">On Site Tools</h1>
        <p className="text-text-secondary text-center mb-8">Gate staff check-in &amp; ticket scanner</p>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          <div className="space-y-2">
            <label className="text-xs uppercase font-semibold text-text-secondary tracking-wider">Event Link, ID, or Code</label>
            <input
              type="text"
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              placeholder="https://decksalone.com/events/10 or Event ID"
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted focus:outline-none focus:border-[#d3da0c] transition-colors font-mono text-sm"
              required
            />
            <p className="text-[11px] text-text-muted">Paste event link from organizer or enter the ID</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase font-semibold text-text-secondary tracking-wider">Staff Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="staff"
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted focus:outline-none focus:border-[#d3da0c] transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase font-semibold text-text-secondary tracking-wider">Staff Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Gate password set by organizer"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder:text-text-muted focus:outline-none focus:border-[#d3da0c] transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#d3da0c] hover:bg-[#c4cb0b] active:scale-[0.99] text-black font-bold text-base rounded-xl py-4 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-[#d3da0c]/20"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In to Gate Tools'}
          </button>
        </form>

        <p className="mt-8 text-xs text-text-muted text-center max-w-xs leading-relaxed">
          Need access credentials? Ask the DJ or event organizer to share the Onsite Access Link, Username, and Password.
        </p>
      </div>
    </div>
  );
}
