import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  BellRing,
  UserX,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
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
    smsBookings: boolean;
    smsTickets: boolean;
    smsPayments: boolean;
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
    showActivity: boolean;
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
    smsBookings: false,
    smsTickets: false,
    smsPayments: false,
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
    showActivity: false,
  },
};

export default function UserSettings() {
  const { user, logout, fetchMe } = useAuthStore();
  const hasVerifiedPhone = !!(user?.phone && user?.phoneVerified);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
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
      const res = await api.put('/users/profile', { username, gender, dateOfBirth });
      if (res.data?.success) {
        setSaved(true);
        toast.success('Profile updated successfully');
        fetchMe();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(res.data?.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setSaveError(getApiErrorMessage(err, 'Failed to update profile'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.put('/users/password', {
        currentPassword,
        newPassword,
      });
      if (res.data?.success) {
        setPasswordSuccess(true);
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 5000);
      } else {
        setPasswordError(res.data?.error || 'Failed to change password');
      }
    } catch (err: any) {
      setPasswordError(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      setIsChangingPassword(false);
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
    } catch (err: any) {
      setSaveError(getApiErrorMessage(err, 'Failed to delete account'));
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
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
      setSaveError(getApiErrorMessage(err, 'Failed to save settings'));
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
          Account Settings
        </h1>
      </div>

      {/* Account Info */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Mail className="w-4 h-4 text-gold" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-text-secondary">Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-black-surface border-dark-gray text-text-primary"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-text-secondary">Email</Label>
            <Input
              type="email"
              value={email}
              disabled
              className="bg-black-surface border-dark-gray text-text-muted opacity-70 cursor-not-allowed"
            />
            <p className="text-xs text-text-muted">Email can only be changed through the secure verification flow. Contact support to update it.</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-text-secondary">Date of Birth 🎂</Label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f4e059]/10 border border-[#f4e059]/30 text-[#f4e059]">16+ Only</span>
            </div>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="bg-black-surface border-dark-gray text-text-primary"
            />
            <p className="text-[11px] text-text-muted">Must be at least 16 years old. You'll receive a birthday wish email on your birthday!</p>
          </div>
          <div className="space-y-2">
            <Label className="text-text-secondary">Gender</Label>

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-black-surface border border-dark-gray text-text-primary text-sm outline-none focus:border-gold"
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
            <p className="text-sm text-red">{saveError}</p>
          )}

          <Button
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="bg-gold text-black hover:bg-gold-light"
          >
            {isSavingProfile ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : saved ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSavingProfile ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Lock className="w-4 h-4 text-gold" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-text-secondary">Current Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-black-surface border-dark-gray text-text-primary pr-10"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-text-secondary">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-black-surface border-dark-gray text-text-primary"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-text-secondary">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-black-surface border-dark-gray text-text-primary"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-red">{passwordError}</p>
          )}
          {passwordSuccess && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-green"
            >
              Password changed successfully
            </motion.p>
          )}

          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="bg-gold text-black hover:bg-gold-light"
          >
            {isChangingPassword ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary flex items-center gap-2">
            <BellRing className="w-4 h-4 text-gold" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Email Notifications</h4>
            <div className="space-y-3">
              <NotificationToggle
                label="Booking Updates"
                description="Booking requests and status changes"
                checked={settings.notifications.emailBookings}
                onChange={(v) => updateNotification('emailBookings', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="New Messages"
                description="Direct messages and system alerts"
                checked={settings.notifications.emailMessages}
                onChange={(v) => updateNotification('emailMessages', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Likes on My Mixes"
                description="When someone likes your mix"
                checked={settings.notifications.emailLikes}
                onChange={(v) => updateNotification('emailLikes', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Comments"
                description="Comments and replies on your mixes"
                checked={settings.notifications.emailComments}
                onChange={(v) => updateNotification('emailComments', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="New Followers"
                description="When someone follows you"
                checked={settings.notifications.emailFollows}
                onChange={(v) => updateNotification('emailFollows', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Re-ups / Reposts"
                description="When someone re-ups your mix"
                checked={settings.notifications.emailReups}
                onChange={(v) => updateNotification('emailReups', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="New Mixes from Followed DJs"
                description="When DJs you follow upload a mix"
                checked={settings.notifications.emailNewMixes}
                onChange={(v) => updateNotification('emailNewMixes', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Events"
                description="Event reminders and updates"
                checked={settings.notifications.emailEvents}
                onChange={(v) => updateNotification('emailEvents', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Tickets"
                description="Ticket purchases and approvals"
                checked={settings.notifications.emailTickets}
                onChange={(v) => updateNotification('emailTickets', v)}
                disabled={settingsLoading}
              />
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
              <NotificationToggle
                label="Marketing & Promotions"
                description="News, events, and special offers"
                checked={settings.notifications.emailMarketing}
                onChange={(v) => updateNotification('emailMarketing', v)}
                disabled={settingsLoading}
              />
            </div>
          </div>

          <div className="border-t border-dark-gray" />

          {/* SMS Notifications */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">SMS Notifications</h4>
            <p className="text-xs text-text-muted mb-3">
              Receive SMS to your verified phone number. Standard message rates apply.
            </p>
            {!hasVerifiedPhone && (
              <p className="text-xs text-gold mb-3">
                Add and verify a phone number to enable SMS notifications.
              </p>
            )}
            <div className="space-y-3">
              <NotificationToggle
                label="Booking Updates"
                description="Booking requests and status changes"
                checked={settings.notifications.smsBookings}
                onChange={(v) => updateNotification('smsBookings', v)}
                disabled={settingsLoading || !hasVerifiedPhone}
              />
              <NotificationToggle
                label="Tickets"
                description="Ticket purchases and approvals"
                checked={settings.notifications.smsTickets}
                onChange={(v) => updateNotification('smsTickets', v)}
                disabled={settingsLoading || !hasVerifiedPhone}
              />
              <NotificationToggle
                label="Payments"
                description="Payment and payout updates"
                checked={settings.notifications.smsPayments}
                onChange={(v) => updateNotification('smsPayments', v)}
                disabled={settingsLoading || !hasVerifiedPhone}
              />
            </div>
          </div>

          <div className="border-t border-dark-gray" />

          {/* Push Notifications */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Push Notifications</h4>
            <div className="space-y-3">
              <NotificationToggle
                label="Booking Alerts"
                description="Real-time alerts for bookings"
                checked={settings.notifications.pushBookings}
                onChange={(v) => updateNotification('pushBookings', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Message Alerts"
                description="Real-time alerts for messages"
                checked={settings.notifications.pushMessages}
                onChange={(v) => updateNotification('pushMessages', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Likes"
                description="When someone likes your mix"
                checked={settings.notifications.pushLikes}
                onChange={(v) => updateNotification('pushLikes', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Comments"
                description="Comments and replies on your mixes"
                checked={settings.notifications.pushComments}
                onChange={(v) => updateNotification('pushComments', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="New Followers"
                description="When someone follows you"
                checked={settings.notifications.pushFollows}
                onChange={(v) => updateNotification('pushFollows', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="Re-ups / Reposts"
                description="When someone re-ups your mix"
                checked={settings.notifications.pushReups}
                onChange={(v) => updateNotification('pushReups', v)}
                disabled={settingsLoading}
              />
              <NotificationToggle
                label="New Mixes from Followed DJs"
                description="When DJs you follow upload"
                checked={settings.notifications.pushNewMixes}
                onChange={(v) => updateNotification('pushNewMixes', v)}
                disabled={settingsLoading}
              />
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold" />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Public Profile</p>
              <p className="text-xs text-text-muted">Allow others to view your profile</p>
            </div>
            <Switch
              checked={settings.privacy.profilePublic}
              onCheckedChange={(v) => updatePrivacy('profilePublic', v)}
              disabled={settingsLoading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Allow Messages</p>
              <p className="text-xs text-text-muted">Let DJs message you</p>
            </div>
            <Switch
              checked={settings.privacy.allowMessages}
              onCheckedChange={(v) => updatePrivacy('allowMessages', v)}
              disabled={settingsLoading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Show Activity Feed</p>
              <p className="text-xs text-text-muted">Display your likes and ratings publicly</p>
            </div>
            <Switch
              checked={settings.privacy.showActivity}
              onCheckedChange={(v) => updatePrivacy('showActivity', v)}
              disabled={settingsLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Settings Button */}
      {settingsDirty && (
        <Button
          onClick={handleSaveSettings}
          className="bg-gold text-black hover:bg-gold-light w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Notification & Privacy Settings
        </Button>
      )}

      {/* Danger Zone */}
      <Card className="bg-red/5 border-red/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-red flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Delete Account</p>
              <p className="text-xs text-text-muted">
                Permanently delete your account and all data
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red/30 text-red hover:bg-red/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-black-surface border-dark-gray text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-text-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              This action cannot be undone. All your data, bookings, and messages will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red/5 border border-red/20 rounded-lg">
            <p className="text-sm text-red">
              Are you sure you want to delete your account? This cannot be reversed.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-dark-gray text-text-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-red text-white hover:bg-red/90"
            >
              {isDeletingAccount ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserX className="w-4 h-4 mr-2" />
              )}
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
