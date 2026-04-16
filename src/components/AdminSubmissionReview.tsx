import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getActiveCategories } from '../lib/categories';
import { Category } from '../types/db';

export default function AdminSubmissionReview() {
  const [pending, setPending] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [summary, setSummary] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const load = async () => {
    const [{ data }, cats] = await Promise.all([
      supabase
        .from('submissions')
        .select('id,site_id,user_id,submitted_article_title,submitted_article_date,submitted_article_url,article_text,created_at,sites(label,source_url,territories(name)),profiles!submissions_user_id_fkey(email),article_ai_results(id,summary,article_ai_result_categories(category_id))')
        .eq('review_status', 'pending')
        .eq('matched_current_record', false)
        .order('created_at', { ascending: true }),
      getActiveCategories()
    ]);
    setPending(data ?? []);
    setCategories(cats);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selected) return;
    const ai = selected.article_ai_results;
    setSummary(ai?.summary ?? '');
    setSelectedCategories(ai?.article_ai_result_categories?.map((x: any) => x.category_id) ?? []);
  }, [selected]);

  const approve = async () => {
    if (!selected) return;
    const { data: userData } = await supabase.auth.getUser();
    await supabase.rpc('admin_approve_submission', {
      p_submission_id: selected.id,
      p_summary: summary,
      p_category_ids: selectedCategories,
      p_admin_user_id: userData.user?.id
    });
    await load();
    setSelected(null);
  };

  const reject = async () => {
    if (!selected) return;
    await supabase.from('submissions').update({ review_status: 'rejected' }).eq('id', selected.id);
    await load();
    setSelected(null);
  };

  return (
    <div className="split">
      <aside className="card">
        <h3>Pending mismatches</h3>
        {pending.map((p) => <button key={p.id} onClick={() => setSelected(p)}>{p.sites.territories.name} - {p.sites.label}</button>)}
      </aside>
      <section className="card">
        {!selected && <p>Select a submission.</p>}
        {selected && (
          <>
            <p><strong>Submitted:</strong> {selected.submitted_article_title}</p>
            <p><strong>Text:</strong></p><pre>{selected.article_text}</pre>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
            <div>{categories.map((c) => (
              <label key={c.id}><input type="checkbox" checked={selectedCategories.includes(c.id)} onChange={() => setSelectedCategories(selectedCategories.includes(c.id) ? selectedCategories.filter((x) => x !== c.id) : [...selectedCategories, c.id])} />{c.name}</label>
            ))}</div>
            <button onClick={approve}>Approve</button>
            <button onClick={reject}>Reject</button>
          </>
        )}
      </section>
    </div>
  );
}
