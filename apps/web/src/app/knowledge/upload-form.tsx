'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Spinner } from '@/components/spinner';
import { Alert, Card } from '@/components/ui';

const SOURCE_TYPES = [
  'internal_policy',
  'brand_guideline',
  'approved_claim',
  'regulatory',
  'historical_campaign',
  'other',
] as const;

export function KnowledgeUploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] =
    useState<(typeof SOURCE_TYPES)[number]>('internal_policy');
  const [category, setCategory] = useState('compliance_policy');
  const [geography, setGeography] = useState('AU');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setContent(text);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          sourceType,
          category: category || undefined,
          geography: geography || undefined,
          documentType: 'policy',
          content,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? 'Upload failed');
      }
      setOk('Document ingested and embedded for retrieval.');
      setContent('');
      setTitle('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-ink">Upload policy / compliance document</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Paste text or choose a .txt / .md file. It is chunked, embedded, and becomes available to the
        analysis agents.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {error ? (
          <Alert tone="error" title="Upload failed">
            {error}
          </Alert>
        ) : null}
        {ok ? <Alert tone="success">{ok}</Alert> : null}
        <label className="block">
          <span className="field-label">Title</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          <label className="block">
            <span className="field-label">Source type</span>
            <select
              className="input"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as (typeof SOURCE_TYPES)[number])}
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Category key</span>
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="wagering_advertising"
            />
          </label>
          <label className="block">
            <span className="field-label">Geography</span>
            <input
              className="input"
              value={geography}
              onChange={(e) => setGeography(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </label>
        </div>
        <label className="block">
          <span className="field-label">Upload file (.txt / .md)</span>
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-700 bg-surface-raised p-3 text-sm text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
        </label>
        <label className="block">
          <span className="field-label">Document content</span>
          <textarea
            className="input font-mono text-[13px]"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            minLength={20}
            placeholder="Paste policy / compliance / sentiment guidance here…"
          />
        </label>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-xs text-ink-subtle">Chunked (~800 chars) and embedded on save.</span>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? <Spinner /> : null}
            {busy ? 'Ingesting…' : 'Save to knowledge base'}
          </button>
        </div>
      </form>
    </Card>
  );
}
