import { FormEvent, useState } from 'react';
import { ArticleInput } from '../types/db';

export default function SubmissionForm({
  onSubmit,
  busy = false
}: {
  onSubmit: (value: ArticleInput) => Promise<void>;
  busy?: boolean;
}) {
  const [form, setForm] = useState<ArticleInput>({ title: '', date: '', url: '' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    await onSubmit(form);
    setForm({ title: '', date: '', url: '' });
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>Submit latest article</h3>
      <input required placeholder="Latest article title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={busy} />
      <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={busy} />
      <input placeholder="Latest article URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} disabled={busy} />
      <button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</button>
    </form>
  );
}
