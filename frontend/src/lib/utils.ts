import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'SAR', locale?: string) {
  const resolvedLocale = locale ?? (currency === 'EGP' ? 'ar-EG' : 'ar-SA');
  return new Intl.NumberFormat(resolvedLocale, { style: 'currency', currency }).format(value);
}

/**
 * Converts any backend image URL to a relative path safe for Next.js proxy.
 * Handles both absolute (http://...) and already-relative (/uploads/..., /storage/...) URLs.
 */
export function toRelativeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  let cleanUrl = url.replace(/^undefined\/?/, '');
  if (cleanUrl.startsWith('uploads/') || cleanUrl.startsWith('storage/')) {
      cleanUrl = '/' + cleanUrl;
  }
  
  try {
    return new URL(cleanUrl).pathname;
  } catch {
    if (!cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
        cleanUrl = '/' + cleanUrl;
    }
    return cleanUrl;
  }
}
