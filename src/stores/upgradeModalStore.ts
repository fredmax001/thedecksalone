import { create } from 'zustand';

interface UpgradeModalState {
  isOpen: boolean;
  feature: string;
  requiredTier: 'pro' | 'legend';
}

interface UpgradeModalStore extends UpgradeModalState {
  open: (feature: string, requiredTier?: 'pro' | 'legend') => void;
  close: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalStore>((set) => ({
  isOpen: false,
  feature: '',
  requiredTier: 'pro',

  open: (feature, requiredTier = 'pro') =>
    set({ isOpen: true, feature, requiredTier }),

  close: () =>
    set({ isOpen: false, feature: '', requiredTier: 'pro' }),
}));
