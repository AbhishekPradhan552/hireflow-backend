import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusColor(status) {
  const colors = {
    applied: 'bg-blue-100 text-blue-800',
    screening: 'bg-yellow-100 text-yellow-800',
    interview: 'bg-purple-100 text-purple-800',
    hired: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function getParseStatusColor(status) {
  const colors = {
    PENDING: 'bg-gray-100 text-gray-600',
    PROCESSING: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

export function getScoreColor(score) {
  if (!score) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}
