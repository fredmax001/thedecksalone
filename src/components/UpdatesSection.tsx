import { useEffect } from 'react';
import { RefreshCw, Download, Loader2, PackageCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useUpdateStore,
  checkForUpdate,
  openUpdatePage,
  getInstalledVersionInfo,
  isUpdateCheckSupported,
} from '@/lib/appUpdates';

/**
 * "App Updates" card — shows the installed version and lets the user check
 * for updates (native app only; the web version updates automatically).
 * Shared between the DJ dashboard settings and user account settings.
 */
export default function UpdatesSection() {
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
