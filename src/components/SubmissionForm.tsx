import { FormEvent, useState } from 'react';
import { ArticleInput } from '../types/db';

export default function SubmissionForm({ onSubmit }: { onSubmit: (value: ArticleInput) => Promise<void> }) {
  const [form, setForm] = useState<ArticleInput>({ title: '', date: '', url: '' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    setForm({ title: '', date: '', url: '' });
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>Submit latest article</h3>
      <input required placeholder="Latest article title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      <input placeholder="Latest article URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      <button type="submit">Submit</button>
    </form>
  );
}
