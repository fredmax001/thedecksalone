import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getMediaUrl } from './api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function imageFallback(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = '/default-avatar.jpg';
}

export function getAvatarUrl(url?: string | null): string {
  if (!url || url.trim() === '' || url === '/placeholder.jpg') {
    return '/default-avatar.jpg';
  }
  return url;
}

export function getAvatarImageUrl(url?: string | null): string {
  return getMediaUrl(url) || '/default-avatar.jpg';
}
