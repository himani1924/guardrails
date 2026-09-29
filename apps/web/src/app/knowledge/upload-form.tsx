'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Card } from '@/components/ui';

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
      <h2 className="text-lg font-medium text-slate-50">Upload policy / compliance document</h2>
      <p className="mt-1 text-sm text-slate-400">
        Paste text or choose a .txt / .md file. It is chunked, embedded, and becomes available to the
        analysis agents.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        {error ? (
          <div className="rounded border border-red-800 bg-red-950/40 p-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}
        {ok ? (
          <div className="rounded border border-emerald-800 bg-emerald-950/40 p-2 text-sm text-emerald-100">
            {ok}
          </div>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">Title</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Source type</span>
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
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Category key</span>
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="wagering_advertising"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Geography</span>
            <input
              className="input"
              value={geography}
              onChange={(e) => setGeography(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">Upload file (.txt / .md)</span>
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-300"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">Document content</span>
          <textarea
            className="input font-mono"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            minLength={20}
            placeholder="Paste policy / compliance / sentiment guidance here…"
          />
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy ? 'Ingesting…' : 'Save to knowledge base'}
          </button>
        </div>
      </form>
      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 6px;
          border: 1px solid rgb(31 41 55);
          background: rgb(17 24 39);
          padding: 0.5rem 0.75rem;
          color: rgb(241 245 249);
          font-size: 0.875rem;
        }
      `}</style>
    </Card>
  );
}
