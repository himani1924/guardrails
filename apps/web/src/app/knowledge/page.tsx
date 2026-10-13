import { knowledge } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { IconBook, IconDoc } from '@/components/icons';
import { EmptyState, PageHeader, SectionHeading, Tag } from '@/components/ui';

import { KnowledgeUploadForm } from './upload-form';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const documents = await knowledge.listDocuments();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Knowledge base"
        title="Policies & compliance rules"
        description="These documents are retrieved during analysis. Upload internal policies, regulatory summaries, brand guidelines, or sentiment case notes."
      />

      <div className="grid gap-8 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-8">
            <KnowledgeUploadForm />
          </div>
        </div>

        <div className="xl:col-span-3">
          <SectionHeading
            eyebrow="Library"
            title={`${documents.length} document${documents.length === 1 ? '' : 's'}`}
          />
          {documents.length === 0 ? (
            <EmptyState icon={<IconBook />} title="No documents yet">
              Upload a policy, or run <code className="rounded bg-slate-800 px-1">npm run db:ingest</code> for demo content.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {documents.map((d) => (
                <article key={d.id} className="rounded-xl border border-line bg-surface p-5 shadow-card">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                      <IconDoc />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-ink">{d.title}</h3>
                        <span className="text-xs tabular-nums text-ink-subtle">
                          {d.content.length.toLocaleString()} chars
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Tag tone="brand">{d.sourceType.replace(/_/g, ' ')}</Tag>
                        {d.category ? <Tag>{d.category}</Tag> : null}
                        {d.geography ? <Tag tone="sky">{d.geography}</Tag> : null}
                      </div>
                      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                        {d.content.slice(0, 420)}
                        {d.content.length > 420 ? '…' : ''}
                      </p>
                      {d.createdAt ? (
                        <p className="mt-2 text-xs text-ink-subtle">
                          Added {new Date(d.createdAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
