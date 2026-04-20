import { FormEvent, useState } from 'react';
import { ArticleInput } from '../types/db';

interface BaselineDetails {
  title?: string | null;
  date?: string | null;
  url?: string | null;
}

export default function MismatchArticlesForm({
  baseline,
  onSave,
  onNoUpdates
}: {
  baseline: BaselineDetails;
  onSave: (rows: ArticleInput[]) => Promise<void>;
  onNoUpdates: () => void;
}) {
  const [rows, setRows] = useState<ArticleInput[]>([{ title: '', date: '', url: '', articleText: '' }]);

  const update = (i: number, patch: Partial<ArticleInput>) => {
    const next = [...rows];
    next[i] = { ...next[i], ...patch };
    setRows(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!rows[0].articleText?.trim()) {
      alert('Newest article text is required.');
      return;
    }

    await onSave(rows);
  };

  return (
    <form className="card mismatch-card" onSubmit={submit}>
      <h3>Last article checked details</h3>
      <p>Your submission did not match the last checked record. Add all newer articles since the one below.</p>

      <div className="baseline">
        <p>
          <strong>Title:</strong> {baseline.title || '—'}
        </p>
        <p>
          <strong>Date:</strong> {baseline.date || '—'}
        </p>
        <p>
          <strong>URL:</strong> {baseline.url || '—'}
        </p>
      </div>

      {rows.map((row, i) => (
        <div key={i} className="row">
          <input
            required
            placeholder="Article title since last checked"
            value={row.title}
            onChange={(e) => update(i, { title: e.target.value })}
          />
          <input type="date" value={row.date} onChange={(e) => update(i, { date: e.target.value })} />
          <input
            placeholder="Article URL since last checked"
            value={row.url}
            onChange={(e) => update(i, { url: e.target.value })}
          />
          {i === 0 && (
            <textarea
              required
              placeholder="Paste newest article text"
              value={row.articleText}
              onChange={(e) => update(i, { articleText: e.target.value })}
            />
          )}
          {rows.length > 1 && (
            <button type="button" className="ghost" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>
              Remove
            </button>
          )}
        </div>
      ))}

      <div className="actions">
        <button type="button" className="ghost" onClick={() => setRows([...rows, { title: '', date: '', url: '' }])}>
          Add older article
        </button>
        <button type="button" className="ghost" onClick={onNoUpdates}>
          No new articles since this one
        </button>
      </div>

      <button type="submit">Submit newer articles</button>
    </form>
  );
}
