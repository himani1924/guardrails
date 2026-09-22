import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-lg border border-surface-border bg-surface-soft p-6 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
      ) : null}
      <h1 className="text-2xl font-semibold text-slate-50">{title}</h1>
      {description ? (
        <div className="mt-1 text-sm text-slate-300">{description}</div>
      ) : null}
    </div>
  );
}

export function StatusBadge({
  level,
  label,
}: {
  level: 'critical' | 'high' | 'medium' | 'low' | 'unknown' | 'info';
  label: string;
}) {
  const styles: Record<typeof level, string> = {
    critical: 'bg-red-950 text-red-200 border-red-800',
    high: 'bg-red-900 text-red-100 border-red-700',
    medium: 'bg-amber-900 text-amber-100 border-amber-700',
    low: 'bg-emerald-900 text-emerald-100 border-emerald-700',
    unknown: 'bg-slate-800 text-slate-200 border-slate-700',
    info: 'bg-sky-900 text-sky-100 border-sky-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs uppercase tracking-wide ${styles[level]}`}
    >
      {label}
    </span>
  );
}
