import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Fantasy price stored as tenths of a million (55 => 5.5m). */
export const FANTASY_BUDGET = 1000;

export function toStoredPrice(display: number): number {
  return Math.round(display * 10);
}

export function fromStoredPrice(stored: number): number {
  return stored / 10;
}

export function formatFantasyPrice(stored: number): string {
  return `${fromStoredPrice(stored).toFixed(1)}m`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getRankSuffix(rank: number): string {
  if (rank === 1) return 'st';
  if (rank === 2) return 'nd';
  if (rank === 3) return 'rd';
  return 'th';
}

export function getPositionColor(position: string): string {
  switch (position) {
    case 'GK': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'DEF': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    case 'MID': return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'FWD': return 'text-red-400 bg-red-400/10 border-red-400/30';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
  }
}

export function getPositionFull(position: string): string {
  switch (position) {
    case 'GK': return 'Goalkeeper';
    case 'DEF': return 'Defender';
    case 'MID': return 'Midfielder';
    case 'FWD': return 'Forward';
    default: return position;
  }
}

export const FORMATIONS = [
  '4-4-2', '4-3-3', '3-5-2', '4-5-1', '3-4-3',
  '4-2-3-1', '5-3-2', '5-4-1', '4-1-4-1', '3-4-2-1',
] as const;

export function getFormationPositions(formation: string): { gk: number; def: number; mid: number; fwd: number } {
  const parts = formation.split('-').map(Number);
  return {
    gk: 1,
    def: parts[0] || 4,
    mid: parts[1] || 4,
    fwd: parts[2] || 2,
  };
}
