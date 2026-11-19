import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MinusCircle,
  XCircle,
} from 'lucide-react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_MAP: Record<string, Tone> = {
  // Positive
  'Paid Customer': 'success',
  Active: 'success',
  Paid: 'success',
  Received: 'success',
  Completed: 'success',
  Converted: 'success',
  Validated: 'success',
  'Yes (₹25,000+)': 'success',
  // Warning / Pending
  'Trial Customer': 'info',
  'Demo Scheduled': 'info',
  'Qualified Lead': 'info',
  'Expiring Soon': 'warning',
  Pending: 'warning',
  'In Progress': 'info',
  'Needs Follow-up': 'warning',
  Partial: 'warning',
  Scheduled: 'info',
  'Yes (₹20,000)': 'info',
  // Critical / Negative
  Overdue: 'danger',
  Suspended: 'danger',
  Lost: 'danger',
  Cancelled: 'danger',
  'Inactive Customer': 'neutral',
  No: 'danger',
  'No-Show': 'danger',
  // Neutral
  Prospect: 'neutral',
  Planned: 'neutral',
  'Not Started': 'neutral',
  Paused: 'neutral',
};

export const StatusText: React.FC<{ label: string; tone?: Tone }> = ({ label, tone }) => {
  const resolvedTone = tone || TONE_MAP[label] || 'neutral';

  const colorClass =
    resolvedTone === 'success'
      ? 'text-emerald-700'
      : resolvedTone === 'warning'
        ? 'text-amber-700'
        : resolvedTone === 'danger'
          ? 'text-red-700'
          : resolvedTone === 'info'
            ? 'text-blue-700'
            : 'text-slate-600';

  const Icon =
    resolvedTone === 'success'
      ? CheckCircle2
      : resolvedTone === 'warning'
        ? AlertTriangle
        : resolvedTone === 'danger'
          ? XCircle
          : resolvedTone === 'info'
            ? Clock
            : MinusCircle;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${colorClass}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
