import type { types } from '@guardrail/core';

import { ConfidenceMeter, LEVEL_ACCENT, StatusBadge, Tag } from './ui';

export const DIM_LABEL: Record<types.RiskDimension, string> = {
  compliance: 'Compliance',
  cultural: 'Cultural',
  sentiment: 'Sentiment',
  brand: 'Brand',
  evidence: 'Evidence',
  polarization: 'Polarization',
};

export function RiskCard({ risk: r, maxReasons = 3 }: { risk: types.RiskAssessment; maxReasons?: number }) {
  return (
    <div className={`flex flex-col rounded-xl border border-l-4 border-line bg-surface p-5 shadow-card ${LEVEL_ACCENT[r.level]}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{DIM_LABEL[r.dimension] ?? r.dimension} risk</h3>
        <StatusBadge level={r.level} label={r.level} />
      </div>
      {r.reasons.length > 0 ? (
        <ul className="mt-3 flex-1 space-y-1.5 text-sm text-ink-muted">
          {r.reasons.slice(0, maxReasons).map((rr, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              <span>{rr}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 flex-1 text-sm text-ink-subtle">No signals in this dimension.</p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <ConfidenceMeter value={r.confidence} />
        {r.humanReviewRequired ? <Tag tone="amber">Review required</Tag> : null}
      </div>
    </div>
  );
}
