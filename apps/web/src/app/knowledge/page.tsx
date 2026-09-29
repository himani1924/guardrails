import { knowledge } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { Card, SectionHeading } from '@/components/ui';

import { KnowledgeUploadForm } from './upload-form';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const documents = await knowledge.listDocuments();

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Knowledge base"
        title="Policies & compliance rules"
        description="These documents are retrieved during analysis. Upload internal policies, regulatory summaries, brand guidelines, or sentiment case notes."
      />

      <div className="mb-8">
        <KnowledgeUploadForm />
      </div>

      <SectionHeading eyebrow="Library" title={`${documents.length} document${documents.length === 1 ? '' : 's'}`} />
      {documents.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-300">
            No documents yet. Upload a policy above, or run <code className="text-slate-100">npm run db:ingest</code> for demo content.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-widest text-slate-400">
                    {d.sourceType}
                    {d.category ? ` · ${d.category}` : ''}
                    {d.geography ? ` · ${d.geography}` : ''}
                  </div>
                  <h3 className="mt-1 text-base font-medium text-slate-50">{d.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                    {d.content.slice(0, 420)}
                    {d.content.length > 420 ? '…' : ''}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {d.content.length.toLocaleString()} chars
                  <br />
                  {d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
