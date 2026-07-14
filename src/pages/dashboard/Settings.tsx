import { useState, useEffect } from 'react';
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
  Sun,
  Moon,
  Loader2,
  Power,
  PowerOff,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
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

interface UserSettings {
  notifications: {
    emailBookings: boolean;
    emailMessages: boolean;
    emailMarketing: boolean;
    pushBookings: boolean;
    pushMessages: boolean;
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
    pushBookings: true,
    pushMessages: true,
  },
  privacy: {
    profilePublic: true,
    allowMessages: true,
    showEarnings: false,
  },
};

export default function SettingsPage() {
  const { user, logout, fetchMe } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
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
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaveError('');
    setSaved(false);
    setIsSavingProfile(true);

    try {
      const res = await api.put('/auth/me', { username, email, gender });
      if (res.data.success) {
        setSaved(true);
        fetchMe();
        toast.success('Profile updated successfully');
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(res.data.error || 'Failed to update profile');
      }
    } catch (error: any) {
      setSaveError(error.response?.data?.error || 'Failed to update profile');
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
      setSaveError(error.response?.data?.error || 'Failed to delete account');
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
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updateNotification = (key: keyof UserSettings['notifications'], value: boolean) => {
    const next = { ...settings, notifications: { ...settings.notifications, [key]: value } };
    setSettings(next);
    setSettingsDirty(true);
  };

  const updatePrivacy = (key: keyof UserSettings['privacy'], value: boolean) => {
    const next = { ...settings, privacy: { ...settings.privacy, [key]: value } };
    setSettings(next);
    setSettingsDirty(true);
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
      setSaveError(err.response?.data?.error || 'Failed to save settings');
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
      toast.error(err.response?.data?.error || 'Failed to update profile status');
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
          <TabsTrigger value="appearance" className="data-[state=active]:bg-gold data-[state=active]:text-black">Appearance</TabsTrigger>
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
                  checked={settings.notifications.emailBookings}
                  onCheckedChange={(v) => updateNotification('emailBookings', v)}
                  disabled={settingsLoading}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">New Messages</p>
                  <p className="text-xs text-text-secondary">Get notified when you receive a message</p>
                </div>
                <Switch
                  checked={settings.notifications.emailMessages}
                  onCheckedChange={(v) => updateNotification('emailMessages', v)}
                  disabled={settingsLoading}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Marketing & Updates</p>
                  <p className="text-xs text-text-secondary">News, tips, and platform updates</p>
                </div>
                <Switch
                  checked={settings.notifications.emailMarketing}
                  onCheckedChange={(v) => updateNotification('emailMarketing', v)}
                  disabled={settingsLoading}
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
                  checked={settings.notifications.pushBookings}
                  onCheckedChange={(v) => updateNotification('pushBookings', v)}
                  disabled={settingsLoading}
                />
              </div>
              <div className="border-t border-dark-gray" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Message Alerts</p>
                  <p className="text-xs text-text-secondary">Real-time alerts for messages</p>
                </div>
                <Switch
                  checked={settings.notifications.pushMessages}
                  onCheckedChange={(v) => updateNotification('pushMessages', v)}
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

        <TabsContent value="appearance" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Theme</p>
                  <p className="text-xs text-text-secondary">Switch between light and dark mode</p>
                </div>
                <Button
                  variant="outline"
                  className="border-dark-gray text-text-primary hover:bg-black-elevated flex items-center gap-2"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4" /> Dark
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" /> Light
                    </>
                  )}
                </Button>
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
