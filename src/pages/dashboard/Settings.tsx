import { useState } from 'react';
import {
  Shield,
  Trash2,
  AlertTriangle,
  Save,
  Check,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailMessages: true,
    emailMarketing: false,
    pushBookings: true,
    pushMessages: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    allowMessages: true,
    showEarnings: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Settings
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your account, notifications, and preferences.
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green text-sm">
            <Check className="w-4 h-4" />
            Settings saved
          </div>
        )}
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="bg-black-elevated border border-dark-gray flex-wrap h-auto">
          <TabsTrigger value="account" className="data-[state=active]:bg-gold data-[state=active]:text-black">Account</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-gold data-[state=active]:text-black">Notifications</TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-gold data-[state=active]:text-black">Privacy</TabsTrigger>
          <TabsTrigger value="danger" className="data-[state=active]:bg-red data-[state=active]:text-white">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-4 space-y-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      value={user?.email || ''}
                      readOnly
                      className="pl-10 bg-black-elevated border-dark-gray text-text-primary opacity-60"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Username</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      value={user?.username || ''}
                      readOnly
                      className="pl-10 bg-black-elevated border-dark-gray text-text-primary opacity-60"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Email and username cannot be changed here. Contact support for account changes.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black-surface border-dark-gray">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 bg-black-elevated border-dark-gray text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>
              <Button className="bg-gold-gradient text-black hover:opacity-90" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Booking Requests</p>
                  <p className="text-xs text-text-secondary">Get notified when someone books you</p>
                </div>
                <Switch
                  checked={notifications.emailBookings}
                  onCheckedChange={(v) => setNotifications({ ...notifications, emailBookings: v })}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">New Messages</p>
                  <p className="text-xs text-text-secondary">Get notified when you receive a message</p>
                </div>
                <Switch
                  checked={notifications.emailMessages}
                  onCheckedChange={(v) => setNotifications({ ...notifications, emailMessages: v })}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Marketing & Updates</p>
                  <p className="text-xs text-text-secondary">News, tips, and platform updates</p>
                </div>
                <Switch
                  checked={notifications.emailMarketing}
                  onCheckedChange={(v) => setNotifications({ ...notifications, emailMarketing: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black-surface border-dark-gray mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Push Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Booking Alerts</p>
                  <p className="text-xs text-text-secondary">Real-time alerts for bookings</p>
                </div>
                <Switch
                  checked={notifications.pushBookings}
                  onCheckedChange={(v) => setNotifications({ ...notifications, pushBookings: v })}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Message Alerts</p>
                  <p className="text-xs text-text-secondary">Real-time alerts for messages</p>
                </div>
                <Switch
                  checked={notifications.pushMessages}
                  onCheckedChange={(v) => setNotifications({ ...notifications, pushMessages: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Privacy Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Public Profile</p>
                  <p className="text-xs text-text-secondary">Make your profile visible to everyone</p>
                </div>
                <Switch
                  checked={privacy.profilePublic}
                  onCheckedChange={(v) => setPrivacy({ ...privacy, profilePublic: v })}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Allow Messages</p>
                  <p className="text-xs text-text-secondary">Let clients and fans message you</p>
                </div>
                <Switch
                  checked={privacy.allowMessages}
                  onCheckedChange={(v) => setPrivacy({ ...privacy, allowMessages: v })}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Show Earnings</p>
                  <p className="text-xs text-text-secondary">Display earnings on your public profile</p>
                </div>
                <Switch
                  checked={privacy.showEarnings}
                  onCheckedChange={(v) => setPrivacy({ ...privacy, showEarnings: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-4">
          <Card className="bg-black-surface border-red/30">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-red flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Deactivate Profile</p>
                  <p className="text-xs text-text-secondary">Temporarily hide your profile from public view</p>
                </div>
                <Button variant="outline" className="border-dark-gray text-text-primary hover:bg-black-elevated">
                  Deactivate
                </Button>
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-red">Delete Account</p>
                  <p className="text-xs text-text-secondary">Permanently delete your account and all data</p>
                </div>
                <Button
                  variant="outline"
                  className="border-red text-red hover:bg-red/10"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-black-surface border-dark-gray text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-red flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              This action cannot be undone. All your data, mixes, bookings, and profile information will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-dark-gray text-text-primary" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-red hover:bg-red/90 text-black">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
