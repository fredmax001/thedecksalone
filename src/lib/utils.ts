import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function imageFallback(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = '/placeholder.jpg';
}
