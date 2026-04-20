import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getActiveCategories } from '../lib/categories';
import { Category } from '../types/db';
import ErrorBanner from './ErrorBanner';
import { normalizeDate, normalizeTitle, normalizeUrl } from '../lib/compare';

const errorMessage = (e: unknown, fallback: string) => {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') {
    return (e as any).message as string;
  }
  return fallback;
};

export default function AdminSubmissionReview() {
  const [pending, setPending] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [summary, setSummary] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [{ data, error: loadError }, cats] = await Promise.all([
        supabase
          .from('submissions')
          .select(
            'id,site_id,user_id,submitted_article_title,submitted_article_date,submitted_article_url,article_text,created_at,sites(label,source_url,territories(name),site_latest_articles(latest_article_title,latest_article_date,latest_article_url)),profiles!submissions_user_id_fkey(email),article_ai_results(id,summary,article_ai_result_categories(category_id))'
          )
          .eq('review_status', 'pending')
          .eq('matched_current_record', false)
          .order('created_at', { ascending: true }),
        getActiveCategories()
      ]);
      if (loadError) throw loadError;
      setPending(data ?? []);
      setCategories(cats);
    } catch (e) {
      setError(errorMessage(e, 'Could not load pending submissions.'));
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selected) return;
    const ai = selected.article_ai_results;
    setSummary(ai?.summary ?? '');
    setSelectedCategories(ai?.article_ai_result_categories?.map((x: any) => x.category_id) ?? []);
  }, [selected]);

  const approve = async () => {
    if (!selected || busy) return;
    const confirmed = window.confirm(
      `Approve "${selected.submitted_article_title ?? '(no title)'}" for ${selected.sites?.label ?? 'this site'}? This will replace the current baseline.`
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error: rpcError } = await supabase.rpc('admin_approve_submission', {
        p_submission_id: selected.id,
        p_summary: summary,
        p_category_ids: selectedCategories,
        p_admin_user_id: userData.user?.id
      });
      if (rpcError) throw rpcError;
      await load();
      setSelected(null);
    } catch (e) {
      setError(errorMessage(e, 'Approve failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!selected || busy) return;
    const confirmed = window.confirm(
      `Reject "${selected.submitted_article_title ?? '(no title)'}"? This cannot be undone here.`
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ review_status: 'rejected' })
        .eq('id', selected.id);
      if (updateError) throw updateError;
      await load();
      setSelected(null);
    } catch (e) {
      setError(errorMessage(e, 'Reject failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const rerunAi = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: fnError } = await supabase.functions.invoke('summarize-article', {
        body: { submission_id: selected.id }
      });
      if (fnError) throw fnError;
      await load();
      const refreshed = pending.find((p) => p.id === selected.id);
      if (refreshed) setSelected(refreshed);
    } catch (e) {
      setError(errorMessage(e, 'Could not run AI summary.'));
    } finally {
      setBusy(false);
    }
  };

  const baseline = selected?.sites?.site_latest_articles ?? null;
  const titleChanged =
    baseline && normalizeTitle(baseline.latest_article_title) !== normalizeTitle(selected?.submitted_article_title);
  const dateChanged =
    baseline && normalizeDate(baseline.latest_article_date) !== normalizeDate(selected?.submitted_article_date);
  const urlChanged =
    baseline && normalizeUrl(baseline.latest_article_url) !== normalizeUrl(selected?.submitted_article_url);

  return (
    <div className="split">
      <aside className="card">
        <h3>Pending mismatches</h3>
        {pending.length === 0 && <p className="muted">None pending.</p>}
        {pending.map((p) => <button key={p.id} onClick={() => setSelected(p)}>{p.sites.territories.name} - {p.sites.label}</button>)}
      </aside>
      <section className="card">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {!selected && <p>Select a submission.</p>}
        {selected && (
          <>
            <div className="diff-grid">
              <div className="diff-grid__col">
                <h4>Current baseline</h4>
                <div className={`diff-grid__field ${titleChanged ? 'diff-grid__field--changed' : ''}`}>
                  <strong>Title:</strong> {baseline?.latest_article_title || '—'}
                </div>
                <div className={`diff-grid__field ${dateChanged ? 'diff-grid__field--changed' : ''}`}>
                  <strong>Date:</strong> {baseline?.latest_article_date || '—'}
                </div>
                <div className={`diff-grid__field ${urlChanged ? 'diff-grid__field--changed' : ''}`}>
                  <strong>URL:</strong> {baseline?.latest_article_url || '—'}
                </div>
              </div>
              <div className="diff-grid__col">
                <h4>Submitted</h4>
                <div className={`diff-grid__field ${titleChanged ? 'diff-grid__field--changed' : ''}`}>
                  <strong>Title:</strong> {selected.submitted_article_title || '—'}
                </div>
                <div className={`diff-grid__field ${dateChanged ? 'diff-grid__field--changed' : ''}`}>
                  <strong>Date:</strong> {selected.submitted_article_date || '—'}
                </div>
                <div className={`diff-grid__field ${urlChanged ? 'diff-grid__field--changed' : ''}`}>
                  <strong>URL:</strong> {selected.submitted_article_url || '—'}
                </div>
              </div>
            </div>
            <p><strong>Article text:</strong></p>
            <pre>{selected.article_text || '(none)'}</pre>
            {!selected.article_ai_results?.summary && (
              <div className="muted" style={{ margin: '0.5rem 0' }}>
                No AI summary yet.{' '}
                <button type="button" className="ghost" onClick={rerunAi} disabled={busy} style={{ width: 'auto' }}>
                  {busy ? 'Running…' : 'Run AI now'}
                </button>
              </div>
            )}
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} disabled={busy} />
            <div>{categories.map((c) => (
              <label key={c.id}><input type="checkbox" checked={selectedCategories.includes(c.id)} onChange={() => setSelectedCategories(selectedCategories.includes(c.id) ? selectedCategories.filter((x) => x !== c.id) : [...selectedCategories, c.id])} disabled={busy} />{c.name}</label>
            ))}</div>
            <div className="actions">
              <button onClick={approve} disabled={busy}>{busy ? 'Working…' : 'Approve'}</button>
              <button className="ghost" onClick={reject} disabled={busy}>Reject</button>
              {selected.article_ai_results?.summary && (
                <button type="button" className="ghost" onClick={rerunAi} disabled={busy}>
                  Re-run AI
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
