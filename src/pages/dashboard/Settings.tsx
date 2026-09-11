import { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Download,
  PackageCheck,
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
import { toast } from 'sonner';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { useUpdateStore, checkForUpdate, openUpdatePage, getInstalledVersionInfo, isUpdateCheckSupported } from '@/lib/appUpdates';

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function UpdatesSection() {
  const { status, info, installed, updateAvailable, lastChecked } = useUpdateStore();
  const native = isUpdateCheckSupported();
  const checking = status === 'checking';

  useEffect(() => {
    getInstalledVersionInfo().then((v) =>
      useUpdateStore.getState().setState({ installed: v })
    );
  }, []);

  const handleCheck = () => {
    checkForUpdate(true).catch(() => {});
  };

  return (
    <Card className="bg-black-surface border-dark-gray">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          App Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-text-primary">Current Version</p>
            <p className="text-xs text-text-secondary">
              {installed
                ? `${installed.version}${installed.build ? ` (build ${installed.build})` : ''}`
                : 'Detecting…'}
            </p>
          </div>
          {native && (
            <Button
              variant="outline"
              className="border-dark-gray text-text-primary hover:bg-black-elevated"
              onClick={handleCheck}
              disabled={checking}
            >
              {checking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Check for updates
            </Button>
          )}
        </div>

        {!native && (
          <>
            <div className="border-t border-dark-gray" />
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <PackageCheck className="w-4 h-4 text-green" />
              You're using the web version — updates apply automatically.
            </div>
          </>
        )}

        {native && status === 'up-to-date' && !updateAvailable && (
          <>
            <div className="border-t border-dark-gray" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-green">
                <PackageCheck className="w-4 h-4" />
                You're on the latest version
              </div>
              {lastChecked && (
                <p className="text-xs text-text-muted">
                  Last checked: {new Date(lastChecked).toLocaleString()}
                </p>
              )}
            </div>
          </>
        )}

        {native && updateAvailable && info && (
          <>
            <div className="border-t border-dark-gray" />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Version {info.latestVersion} is available
                </p>
                {info.releaseNotes && (
                  <p className="text-xs text-text-secondary mt-1 whitespace-pre-line">
                    {info.releaseNotes}
                  </p>
                )}
              </div>
              <Button
                className="bg-gold-gradient text-black hover:opacity-90"
                onClick={() => openUpdatePage()}
              >
                <Download className="w-4 h-4 mr-2" />
                Update now on Google Play
              </Button>
            </div>
          </>
        )}

        {native && status === 'error' && (
          <>
            <div className="border-t border-dark-gray" />
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-red">Couldn't check for updates. Please try again.</p>
              <Button
                variant="outline"
                className="border-dark-gray text-text-primary hover:bg-black-elevated"
                onClick={handleCheck}
              >
                Retry
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface UserSettings {
  notifications: {
    emailBookings: boolean;
    emailMessages: boolean;
    emailMarketing: boolean;
    emailLikes: boolean;
    emailComments: boolean;
    emailFollows: boolean;
    emailReups: boolean;
    emailNewMixes: boolean;
    emailEvents: boolean;
    emailTickets: boolean;
    emailVerifications: boolean;
    emailSubscriptions: boolean;
    emailReviews: boolean;
    pushBookings: boolean;
    pushMessages: boolean;
    pushNewMixes: boolean;
    pushLikes: boolean;
    pushComments: boolean;
    pushFollows: boolean;
    pushReups: boolean;
    pushEvents: boolean;
    pushTickets: boolean;
    pushVerifications: boolean;
    pushSubscriptions: boolean;
    pushReviews: boolean;
  };
  privacy: {
    profilePublic: boolean;
    allowMessages: boolean;
    showEarnings: boolean;
  };
}

const defaultSettings: UserSettings = {
  notifications: {
    emailBookings: true,
    emailMessages: true,
    emailMarketing: false,
    emailLikes: true,
    emailComments: true,
    emailFollows: true,
    emailReups: true,
    emailNewMixes: true,
    emailEvents: true,
    emailTickets: true,
    emailVerifications: true,
    emailSubscriptions: true,
    emailReviews: true,
    pushBookings: true,
    pushMessages: true,
    pushNewMixes: true,
    pushLikes: true,
    pushComments: true,
    pushFollows: true,
    pushReups: true,
    pushEvents: true,
    pushTickets: true,
    pushVerifications: true,
    pushSubscriptions: true,
    pushReviews: true,
  },
  privacy: {
    profilePublic: true,
    allowMessages: true,
    showEarnings: false,
  },
};

export default function SettingsPage() {
  const { user, logout, fetchMe } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsDirty, setSettingsDirty] = useState(false);

  // Profile form state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
  );

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  // Fetch settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);
        const res = await api.get('/users/settings');
        if (res.data?.success) {
          setSettings({
            notifications: { ...defaultSettings.notifications, ...res.data.data.notifications },
            privacy: { ...defaultSettings.privacy, ...res.data.data.privacy },
          });
        }
      } catch (err: any) {
        console.error('Failed to load settings:', err);
        // Silently fall back to defaults
      } finally {
        setSettingsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Sync local user state when auth store updates
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setGender(user.gender || '');
      setDateOfBirth(user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaveError('');
    setSaved(false);
    setIsSavingProfile(true);

    try {
      const res = await api.put('/auth/me', { username, email, gender, dateOfBirth });
      if (res.data.success) {
        setSaved(true);
        fetchMe();
        toast.success('Profile updated successfully');

        fetchMe();
        toast.success('Profile updated successfully');
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(res.data.error || 'Failed to update profile');
      }
    } catch (error: any) {
      setSaveError(getApiErrorMessage(error, 'Failed to update profile'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    setSaveError('');
    setIsDeletingAccount(true);

    try {
      const res = await api.delete('/users/account');
      if (res.data.success) {
        logout();
        window.location.href = '/';
      } else {
        setSaveError(res.data.error || 'Failed to delete account');
        setIsDeletingAccount(false);
        setShowDeleteDialog(false);
      }
    } catch (error: any) {
      setSaveError(getApiErrorMessage(error, 'Failed to delete account'));
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', { currentPassword, newPassword });
      if (res.data.success) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.success('Password updated successfully');
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(res.data.error || 'Failed to change password');
      }
    } catch (error: any) {
      setPasswordError(getApiErrorMessage(error, 'Failed to change password'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Optimistic per-toggle save: flip immediately, persist in background,
  // restore previous value on failure. Extra clicks are ignored while pending.
  const toggleSavePending = useRef(false);

  const persistToggle = async (next: UserSettings) => {
    if (toggleSavePending.current) return;
    const previous = settings;
    setSettings(next);
    toggleSavePending.current = true;
    try {
      const res = await api.put('/users/settings', {
        notifications: next.notifications,
        privacy: next.privacy,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to save settings');
      }
      setSettingsDirty(false);
    } catch (err: any) {
      setSettings(previous);
      toast.error('Could not save setting: ' + getApiErrorMessage(err, 'Failed to save setting'));
    } finally {
      toggleSavePending.current = false;
    }
  };

  const updateNotification = (key: keyof UserSettings['notifications'], value: boolean) => {
    void persistToggle({ ...settings, notifications: { ...settings.notifications, [key]: value } });
  };

  const updatePrivacy = (key: keyof UserSettings['privacy'], value: boolean) => {
    void persistToggle({ ...settings, privacy: { ...settings.privacy, [key]: value } });
  };

  const handleSaveSettings = async () => {
    setSaveError('');
    setSaved(false);
    try {
      const res = await api.put('/users/settings', {
        notifications: settings.notifications,
        privacy: settings.privacy,
      });
      if (res.data?.success) {
        setSaved(true);
        setSettingsDirty(false);
        toast.success('Settings saved successfully');
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(res.data?.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setSaveError(getApiErrorMessage(err, 'Failed to save settings'));
    }
  };

  const handleDeactivateProfile = async () => {
    setIsDeactivating(true);
    try {
      const nextPublic = !settings.privacy.profilePublic;
      const res = await api.put('/users/settings', {
        privacy: { profilePublic: nextPublic },
      });
      if (res.data?.success) {
        setSettings((prev) => ({ ...prev, privacy: { ...prev.privacy, profilePublic: nextPublic } }));
        toast.success(nextPublic ? 'Profile activated' : 'Profile deactivated');
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update profile status'));
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Settings
          </h1>
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
          <TabsTrigger value="updates" className="data-[state=active]:bg-gold data-[state=active]:text-black">Updates</TabsTrigger>
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-black-elevated border-dark-gray text-text-primary"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Username</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-black-elevated border-dark-gray text-text-primary"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block flex items-center justify-between">
                    <span>Date of Birth 🎂</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">16+ Only</span>
                  </Label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                  <p className="text-[11px] text-text-muted mt-1">Must be at least 16 years old. You'll receive a special birthday wish email from Deck Salone on your birthday!</p>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Gender</Label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-black-elevated border border-dark-gray text-text-primary text-sm outline-none focus:border-gold"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NON_BINARY">Non-binary</option>
                    <option value="OTHER">Other</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </div>
              </div>


              {saveError && (
                <p className="text-xs text-red">{saveError}</p>
              )}
              <Button
                className="bg-gold-gradient text-black hover:opacity-90"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
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
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>
              {passwordError && (
                <p className="text-xs text-red">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-green flex items-center gap-1">
                  <Check className="w-3 h-3" /> Password updated successfully
                </p>
              )}
              <Button
                className="bg-gold-gradient text-black hover:opacity-90"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationToggle
                label="Booking Requests"
                description="Get notified when someone books you"
                checked={settings.notifications.emailBookings}
                onChange={(v) => updateNotification('emailBookings', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="New Messages"
                description="Get notified when you receive a message"
                checked={settings.notifications.emailMessages}
                onChange={(v) => updateNotification('emailMessages', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Likes on My Mixes"
                description="When someone likes your mix"
                checked={settings.notifications.emailLikes}
                onChange={(v) => updateNotification('emailLikes', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Comments"
                description="Comments and replies on your mixes"
                checked={settings.notifications.emailComments}
                onChange={(v) => updateNotification('emailComments', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="New Followers"
                description="When someone follows you"
                checked={settings.notifications.emailFollows}
                onChange={(v) => updateNotification('emailFollows', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Re-ups / Reposts"
                description="When someone re-ups your mix"
                checked={settings.notifications.emailReups}
                onChange={(v) => updateNotification('emailReups', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="New Mixes from Followed DJs"
                description="When DJs you follow upload"
                checked={settings.notifications.emailNewMixes}
                onChange={(v) => updateNotification('emailNewMixes', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Events & Tickets"
                description="Event reminders and ticket updates"
                checked={settings.notifications.emailEvents && settings.notifications.emailTickets}
                onChange={(v) => {
                  updateNotification('emailEvents', v);
                  updateNotification('emailTickets', v);
                }}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Verification & Subscriptions"
                description="Verification status and subscription updates"
                checked={settings.notifications.emailVerifications && settings.notifications.emailSubscriptions}
                onChange={(v) => {
                  updateNotification('emailVerifications', v);
                  updateNotification('emailSubscriptions', v);
                }}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Marketing & Updates"
                description="News, tips, and platform updates"
                checked={settings.notifications.emailMarketing}
                onChange={(v) => updateNotification('emailMarketing', v)}
                disabled={settingsLoading}
              />
            </CardContent>
          </Card>

          <Card className="bg-black-surface border-dark-gray">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Push Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationToggle
                label="Booking Alerts"
                description="Real-time alerts for bookings"
                checked={settings.notifications.pushBookings}
                onChange={(v) => updateNotification('pushBookings', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Message Alerts"
                description="Real-time alerts for messages"
                checked={settings.notifications.pushMessages}
                onChange={(v) => updateNotification('pushMessages', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Likes"
                description="When someone likes your mix"
                checked={settings.notifications.pushLikes}
                onChange={(v) => updateNotification('pushLikes', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Comments"
                description="Comments and replies on your mixes"
                checked={settings.notifications.pushComments}
                onChange={(v) => updateNotification('pushComments', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="New Followers"
                description="When someone follows you"
                checked={settings.notifications.pushFollows}
                onChange={(v) => updateNotification('pushFollows', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Re-ups / Reposts"
                description="When someone re-ups your mix"
                checked={settings.notifications.pushReups}
                onChange={(v) => updateNotification('pushReups', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="New Mixes from Followed DJs"
                description="When DJs you follow upload"
                checked={settings.notifications.pushNewMixes}
                onChange={(v) => updateNotification('pushNewMixes', v)}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Events & Tickets"
                description="Event reminders and ticket updates"
                checked={settings.notifications.pushEvents && settings.notifications.pushTickets}
                onChange={(v) => {
                  updateNotification('pushEvents', v);
                  updateNotification('pushTickets', v);
                }}
                disabled={settingsLoading}
              />
              <div className="border-t border-dark-gray" />
              <NotificationToggle
                label="Verification & Subscriptions"
                description="Verification status and subscription updates"
                checked={settings.notifications.pushVerifications && settings.notifications.pushSubscriptions}
                onChange={(v) => {
                  updateNotification('pushVerifications', v);
                  updateNotification('pushSubscriptions', v);
                }}
                disabled={settingsLoading}
              />
            </CardContent>
          </Card>

          {settingsDirty && (
            <Button
              className="bg-gold-gradient text-black hover:opacity-90"
              onClick={handleSaveSettings}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Notification Settings
            </Button>
          )}
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
                  checked={settings.privacy.profilePublic}
                  onCheckedChange={(v) => updatePrivacy('profilePublic', v)}
                  disabled={settingsLoading}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Allow Messages</p>
                  <p className="text-xs text-text-secondary">Let clients and fans message you</p>
                </div>
                <Switch
                  checked={settings.privacy.allowMessages}
                  onCheckedChange={(v) => updatePrivacy('allowMessages', v)}
                  disabled={settingsLoading}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Show Earnings</p>
                  <p className="text-xs text-text-secondary">Display earnings on your public profile</p>
                </div>
                <Switch
                  checked={settings.privacy.showEarnings}
                  onCheckedChange={(v) => updatePrivacy('showEarnings', v)}
                  disabled={settingsLoading}
                />
              </div>
            </CardContent>
          </Card>

          {settingsDirty && (
            <Button
              className="bg-gold-gradient text-black hover:opacity-90"
              onClick={handleSaveSettings}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Privacy Settings
            </Button>
          )}
        </TabsContent>

        <TabsContent value="updates" className="mt-4 space-y-4">
          <UpdatesSection />
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
                  <p className="text-sm font-medium text-text-primary">
                    {settings.privacy.profilePublic ? 'Deactivate Profile' : 'Activate Profile'}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {settings.privacy.profilePublic
                      ? 'Temporarily hide your profile from public view'
                      : 'Make your profile visible to the public again'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className={settings.privacy.profilePublic
                    ? 'border-dark-gray text-text-primary hover:bg-black-elevated'
                    : 'border-green text-green hover:bg-green/10'
                  }
                  onClick={handleDeactivateProfile}
                  disabled={isDeactivating}
                >
                  {isDeactivating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : settings.privacy.profilePublic ? (
                    <>
                      <PowerOff className="w-4 h-4 mr-2" /> Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4 mr-2" /> Activate
                    </>
                  )}
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
            <Button
              className="bg-red hover:bg-red/90 text-black"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
