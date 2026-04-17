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
  const [hasArticlesSinceBaseline, setHasArticlesSinceBaseline] = useState<boolean | null>(null);

  const update = (i: number, patch: Partial<ArticleInput>) => {
    const next = [...rows];
    next[i] = { ...next[i], ...patch };
    setRows(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!hasArticlesSinceBaseline) {
      onNoUpdates();
      return;
    }

    if (!rows[0].articleText?.trim()) {
      alert('Newest article text is required.');
      return;
    }
    await onSave(rows);
  };

  return (
    <form className="card mismatch-card" onSubmit={submit}>
      <h3>Double-check flow</h3>
      <p>Your submission did not match current records.</p>

      <div className="baseline">
        <h4>Last checked article details</h4>
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

      <fieldset className="choice-group">
        <legend>Anything newer since that article?</legend>
        <label>
          <input
            type="radio"
            name="anythingSince"
            checked={hasArticlesSinceBaseline === true}
            onChange={() => setHasArticlesSinceBaseline(true)}
          />
          Yes, there are newer articles
        </label>
        <label>
          <input
            type="radio"
            name="anythingSince"
            checked={hasArticlesSinceBaseline === false}
            onChange={() => setHasArticlesSinceBaseline(false)}
          />
          No, nothing newer
        </label>
      </fieldset>

      {hasArticlesSinceBaseline && (
        <>
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
          <button type="button" className="ghost" onClick={() => setRows([...rows, { title: '', date: '', url: '' }])}>
            Add older article
          </button>
        </>
      )}

      <button type="submit" disabled={hasArticlesSinceBaseline === null}>
        {hasArticlesSinceBaseline ? 'Save mismatch details' : 'Send to admin review'}
      </button>
    </form>
  );
}
