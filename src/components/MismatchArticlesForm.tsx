import { FormEvent, useState } from 'react';
import { ArticleInput } from '../types/db';

export default function MismatchArticlesForm({ baselineTitle, onSave }: { baselineTitle?: string | null; onSave: (rows: ArticleInput[]) => Promise<void> }) {
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
    <form className="card" onSubmit={submit}>
      <h3>Mismatch flow</h3>
      <p>Enter newer articles until you reach stored baseline: <strong>{baselineTitle || 'none'}</strong></p>
      {rows.map((row, i) => (
        <div key={i} className="row">
          <input required placeholder="Article title" value={row.title} onChange={(e) => update(i, { title: e.target.value })} />
          <input type="date" value={row.date} onChange={(e) => update(i, { date: e.target.value })} />
          <input placeholder="Article URL" value={row.url} onChange={(e) => update(i, { url: e.target.value })} />
          {i === 0 && <textarea required placeholder="Paste newest article text" value={row.articleText} onChange={(e) => update(i, { articleText: e.target.value })} />}
          {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>Remove</button>}
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, { title: '', date: '', url: '' }])}>Add older article</button>
      <button type="submit">Save mismatch details</button>
    </form>
  );
}
