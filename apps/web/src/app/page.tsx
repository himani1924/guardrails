import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Card, SectionHeading } from '@/components/ui';

export default function HomePage() {
  return (
    <AppShell>
      <SectionHeading
        eyebrow="Guardrail · MVP"
        title="Marketing compliance & audience-risk review"
        description="A decision-support tool. All findings and simulated audience perspectives are advisory — a human reviewer makes the final decision."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-lg font-medium text-slate-100">Campaigns</h2>
          <p className="mt-2 text-sm text-slate-300">
            Draft, review and analyse campaigns before publication.
          </p>
          <Link
            href="/campaigns"
            className="mt-4 inline-block rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Open campaign list
          </Link>
        </Card>
        <Card>
          <h2 className="text-lg font-medium text-slate-100">Human review queue</h2>
          <p className="mt-2 text-sm text-slate-300">
            Campaigns escalated for reviewer sign-off.
          </p>
          <Link
            href="/review"
            className="mt-4 inline-block rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-600"
          >
            Open review queue
          </Link>
        </Card>
      </div>
      <div className="mt-6 text-xs text-slate-500">
        Health check: <code>GET /api/health</code>
      </div>
    </AppShell>
  );
}

