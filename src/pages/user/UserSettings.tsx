import { useState } from 'react';
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
  Sun,
  Moon,
  Loader2,
  BellRing,
  UserX,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
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

export default function UserSettings() {
  const { user, logout, fetchMe } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile form state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailMessages: true,
    emailMarketing: false,
    pushBookings: true,
    pushMessages: true,
    pushNewMixes: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    allowMessages: true,
    showActivity: false,
  });

  const handleSaveProfile = async () => {
    setSaveError('');
    setSaved(false);
    setIsSavingProfile(true);

    try {
      const res = await api.put('/users/profile', { username, email });
      if (res.data?.success) {
        setSaved(true);
        toast.success('Profile updated successfully');
        fetchMe();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(res.data?.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Failed to update profile');
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
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/account');
      logout();
      window.location.href = '/';
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Failed to delete account');
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
          Account Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your account, password, and preferences.
        </p>
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
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black-surface border-dark-gray text-text-primary"
            />
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
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">Booking Updates</p>
                <p className="text-xs text-text-muted">Emails about booking status changes</p>
              </div>
              <Switch
                checked={notifications.emailBookings}
                onCheckedChange={(v) => setNotifications((prev) => ({ ...prev, emailBookings: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">New Messages</p>
                <p className="text-xs text-text-muted">Emails when you receive a message</p>
              </div>
              <Switch
                checked={notifications.emailMessages}
                onCheckedChange={(v) => setNotifications((prev) => ({ ...prev, emailMessages: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">New Mixes from Followed DJs</p>
                <p className="text-xs text-text-muted">Get notified when DJs you follow upload</p>
              </div>
              <Switch
                checked={notifications.pushNewMixes}
                onCheckedChange={(v) => setNotifications((prev) => ({ ...prev, pushNewMixes: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">Marketing & Promotions</p>
                <p className="text-xs text-text-muted">News, events, and special offers</p>
              </div>
              <Switch
                checked={notifications.emailMarketing}
                onCheckedChange={(v) => setNotifications((prev) => ({ ...prev, emailMarketing: v }))}
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
              checked={privacy.profilePublic}
              onCheckedChange={(v) => setPrivacy((prev) => ({ ...prev, profilePublic: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Allow Messages</p>
              <p className="text-xs text-text-muted">Let DJs message you</p>
            </div>
            <Switch
              checked={privacy.allowMessages}
              onCheckedChange={(v) => setPrivacy((prev) => ({ ...prev, allowMessages: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Show Activity Feed</p>
              <p className="text-xs text-text-muted">Display your likes and ratings publicly</p>
            </div>
            <Switch
              checked={privacy.showActivity}
              onCheckedChange={(v) => setPrivacy((prev) => ({ ...prev, showActivity: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-gold" /> : <Sun className="w-4 h-4 text-gold" />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Dark Mode</p>
              <p className="text-xs text-text-muted">Toggle between light and dark theme</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

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
              className="bg-red text-white hover:bg-red/90"
            >
              <UserX className="w-4 h-4 mr-2" />
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
