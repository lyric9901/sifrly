import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function truncateKey(key: string, head = 6, tail = 6): string {
  if (!key || key.length <= head + tail) return key || '';
  return `${key.slice(0, head)}...${key.slice(-tail)}`;
}
