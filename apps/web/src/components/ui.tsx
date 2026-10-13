import type { HTMLAttributes, ReactNode } from 'react';

import { IconAlert, IconCheck, IconInfo } from './icons';

export type Level = 'critical' | 'high' | 'medium' | 'low' | 'unknown' | 'info';

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Page-level header: eyebrow, H1, description and optional right-side actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? (
          <div className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}

/** Section header inside a page. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 mt-10 flex flex-wrap items-end justify-between gap-3 first:mt-0">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <div className="mt-1 text-sm text-ink-muted">{description}</div> : null}
      </div>
      {actions}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges & tags                                                       */
/* ------------------------------------------------------------------ */

const LEVEL_STYLES: Record<Level, { pill: string; dot: string }> = {
  critical: { pill: 'bg-rose-600 text-white ring-rose-500', dot: 'bg-white' },
  high: { pill: 'bg-red-500/10 text-red-300 ring-red-500/30', dot: 'bg-red-500' },
  medium: { pill: 'bg-amber-500/10 text-amber-300 ring-amber-500/30', dot: 'bg-amber-500' },
  low: { pill: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30', dot: 'bg-emerald-500' },
  unknown: { pill: 'bg-slate-800 text-slate-300 ring-slate-600', dot: 'bg-slate-400' },
  info: { pill: 'bg-sky-500/10 text-sky-300 ring-sky-500/30', dot: 'bg-sky-500' },
};

export function StatusBadge({ level, label }: { level: Level; label: string }) {
  const s = LEVEL_STYLES[level] ?? LEVEL_STYLES.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${s.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label.replace(/_/g, ' ')}
    </span>
  );
}

/** Left accent colour per level, for risk / finding cards. */
export const LEVEL_ACCENT: Record<Level, string> = {
  critical: 'border-l-rose-600',
  high: 'border-l-red-500',
  medium: 'border-l-amber-400',
  low: 'border-l-emerald-500',
  unknown: 'border-l-slate-300',
  info: 'border-l-sky-400',
};

export function Tag({
  children,
  tone = 'slate',
  title,
}: {
  children: ReactNode;
  tone?: 'slate' | 'brand' | 'violet' | 'amber' | 'emerald' | 'sky';
  title?: string;
}) {
  const tones = {
    slate: 'bg-slate-800 text-slate-300',
    brand: 'bg-brand-500/10 text-brand-300',
    violet: 'bg-violet-500/10 text-violet-300',
    amber: 'bg-amber-500/10 text-amber-300',
    emerald: 'bg-emerald-500/10 text-emerald-300',
    sky: 'bg-sky-500/10 text-sky-300',
  } as const;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export const CAMPAIGN_STATUS: Record<string, { level: Level; label: string }> = {
  draft: { level: 'info', label: 'Draft' },
  ready_for_analysis: { level: 'info', label: 'Ready' },
  analyzing: { level: 'medium', label: 'Analyzing' },
  analyzed: { level: 'low', label: 'Analyzed' },
  in_review: { level: 'high', label: 'In review' },
  approved: { level: 'low', label: 'Approved' },
  rejected: { level: 'critical', label: 'Rejected' },
};

export function campaignStatus(status: string): { level: Level; label: string } {
  return CAMPAIGN_STATUS[status] ?? { level: 'unknown', label: status };
}

/* ------------------------------------------------------------------ */
/* Feedback states                                                     */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-surface px-6 py-12 text-center">
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-slate-400">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {children ? <div className="mt-1 max-w-md text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children?: ReactNode;
}) {
  const styles = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  } as const;
  const Icon = tone === 'success' ? IconCheck : tone === 'info' ? IconInfo : IconAlert;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-lg border p-3 text-sm ${styles[tone]}`}>
      <Icon className="mt-0.5 shrink-0" />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5' : ''}>{children}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data display                                                        */
/* ------------------------------------------------------------------ */

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-subtle">{hint}</p> : null}
    </Card>
  );
}

export function ConfidenceMeter({ value, label = 'Confidence' }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const bar = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2 text-xs text-ink-subtle">
      <span className="shrink-0">{label}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-ink-muted">{pct}%</span>
    </div>
  );
}

export function DefinitionRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
