import { useState } from 'react';
import { Megaphone, XIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useActivePopups, type Popup } from '@/hooks/usePopups';

/**
 * PopupManager — renders admin-managed popups app-wide.
 * Admins create them from the admin dashboard (Popups & Alerts section).
 * Each format mirrors a native mobile pattern:
 *   MODAL  → centered alert dialog
 *   BANNER → top alert strip
 *   SHEET  → slide-up bottom sheet
 * Dismissing hides a popup for the current session; scheduling and the
 * active toggle are controlled by the admin.
 */
export default function PopupManager() {
  const { data: popups, isLoading } = useActivePopups();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (isLoading || !popups || popups.length === 0) return null;

  const visible = popups.filter((p) => !dismissedIds.has(p.id));
  const banners = visible.filter((p) => p.type === 'BANNER');
  const overlay = visible.find((p) => p.type === 'MODAL' || p.type === 'SHEET') || null;

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  return (
    <>
      {banners.map((popup, index) => (
        <PopupBanner key={popup.id} popup={popup} index={index} onDismiss={() => dismiss(popup.id)} />
      ))}
      {overlay?.type === 'MODAL' && <PopupDialog popup={overlay} onDismiss={() => dismiss(overlay.id)} />}
      {overlay?.type === 'SHEET' && <PopupSheet popup={overlay} onDismiss={() => dismiss(overlay.id)} />}
    </>
  );
}

function PopupBanner({ popup, index, onDismiss }: { popup: Popup; index: number; onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)]"
      style={{ transform: `translateY(${index * 56}px)` }}
    >
      <div className="mx-auto max-w-3xl flex items-start gap-3 rounded-2xl border border-[#f4e059]/30 bg-[#111111]/95 backdrop-blur-xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <div className="w-8 h-8 rounded-full bg-[#f4e059]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Megaphone className="w-4 h-4 text-[#f4e059]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text-primary">{popup.title}</p>
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{popup.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/5 text-text-muted flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function PopupDialog({ popup, onDismiss }: { popup: Popup; onDismiss: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="border-white/10 bg-[#111111] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">{popup.title}</DialogTitle>
          <DialogDescription className="text-text-muted whitespace-pre-line">
            {popup.message}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function PopupSheet({ popup, onDismiss }: { popup: Popup; onDismiss: () => void }) {
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <SheetContent side="bottom" className="border-white/10 bg-[#111111] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-text-primary text-left">{popup.title}</SheetTitle>
          <SheetDescription className="text-text-muted whitespace-pre-line text-left">
            {popup.message}
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
