import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  MessageSquare,
  Users,
  Activity,
  Bell,
  User,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const quickLinks = [
  { icon: CalendarCheck, label: 'My Bookings', path: '/user/bookings', desc: 'View & manage your bookings' },
  { icon: MessageSquare, label: 'Messages', path: '/user/messages', desc: 'Chat with DJs' },
  { icon: Users, label: 'Following', path: '/user/following', desc: 'DJs you follow' },
  { icon: Activity, label: 'My Activity', path: '/user/activity', desc: 'Likes, ratings & votes' },
  { icon: Bell, label: 'Notifications', path: '/user/notifications', desc: 'Updates & alerts' },
  { icon: User, label: 'Profile', path: '/user/profile', desc: 'Edit your profile' },
  { icon: Settings, label: 'Settings', path: '/user/settings', desc: 'Account preferences' },
];

export default function UserDashboard() {
  const { user } = useAuthStore();
  const displayName = user?.username || user?.email?.split('@')[0] || 'Fan';

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-semibold text-text-primary font-display">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Here&apos;s everything happening in your fan space.
        </p>
      </motion.div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Bookings" value="0" icon={CalendarCheck} />
        <StatCard label="Messages" value="0" icon={MessageSquare} />
        <StatCard label="Following" value="0" icon={Users} />
        <StatCard label="Notifications" value="0" icon={Bell} />
      </div>

      {/* Quick Links Grid */}
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link
                to={link.path}
                className="group flex items-center gap-4 p-4 rounded-xl border border-dark-gray bg-black-surface hover:border-gold/30 transition-all duration-200"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gold/10 text-gold group-hover:bg-gold/20 transition-colors">
                  <link.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary group-hover:text-gold transition-colors">
                    {link.label}
                  </p>
                  <p className="text-xs text-text-muted truncate">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-gold transition-colors" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="rounded-xl border border-dark-gray bg-black-surface p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <Activity className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No recent activity yet.</p>
          <p className="text-xs text-text-muted mt-1">
            Start exploring mixes, events, and DJs to see your activity here.
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-gold-gradient text-black text-sm font-semibold rounded-full hover:scale-[1.02] transition-transform"
          >
            Explore Deck Salone
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-dark-gray bg-black-surface p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gold/10 text-gold">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xl font-semibold text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}
