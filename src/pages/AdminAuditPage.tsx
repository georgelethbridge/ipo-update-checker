import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuditRow {
  id: string;
  label: string;
  territory: { name: string; code: string };
  latest: {
    latest_article_title: string | null;
    latest_article_date: string | null;
    latest_article_url: string | null;
    last_verified_at: string | null;
  } | null;
  latestApprovedSubmission: {
    created_at: string;
    article_ai_results: {
      summary: string | null;
      article_ai_result_categories: Array<{ categories: { name: string } | null }>;
    } | null;
  } | null;
}

interface HistoryRow {
  id: string;
  created_at: string;
  review_status: 'pending' | 'approved' | 'rejected';
  submitted_article_title: string | null;
  matched_current_record: boolean | null;
  profiles: { email: string | null } | null;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyBySite, setHistoryBySite] = useState<Record<string, HistoryRow[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('sites')
      .select(
        'id,label,territories(name,code),site_latest_articles(latest_article_title,latest_article_date,latest_article_url,last_verified_at),submissions!left(created_at,review_status,article_ai_results(summary,article_ai_result_categories(categories(name))))'
      )
      .order('label', { ascending: true });

    const formatted: AuditRow[] = (data ?? []).map((site: any) => {
      const approved = (site.submissions ?? []).find((submission: any) => submission.review_status === 'approved') ?? null;
      return {
        id: site.id,
        label: site.label,
        territory: site.territories,
        latest: site.site_latest_articles,
        latestApprovedSubmission: approved
      };
    });

    setRows(formatted);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleHistory = async (siteId: string) => {
    if (expanded === siteId) {
      setExpanded(null);
      return;
    }
    setExpanded(siteId);
    if (historyBySite[siteId]) return;
    setHistoryLoading(siteId);
    const { data } = await supabase
      .from('submissions')
      .select('id,created_at,review_status,submitted_article_title,matched_current_record,profiles!submissions_user_id_fkey(email)')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(20);
    setHistoryBySite((prev) => ({ ...prev, [siteId]: (data as any) ?? [] }));
    setHistoryLoading(null);
  };

  return (
    <main>
      <h1>Admin: Latest Article Audit</h1>
      <p className="muted">Use this to validate the current baseline and the latest approved summary/categories.</p>
      {rows.map((row) => {
        const categories =
          row.latestApprovedSubmission?.article_ai_results?.article_ai_result_categories
            ?.map((link) => link.categories?.name)
            .filter(Boolean)
            .join(', ') ?? 'None';
        const isOpen = expanded === row.id;
        const history = historyBySite[row.id];

        return (
          <section className="card" key={row.id}>
            <h3>
              {row.territory.name} — {row.label}
            </h3>
            <p>
              <strong>Latest title:</strong> {row.latest?.latest_article_title || 'Not set'}
            </p>
            <p>
              <strong>Latest date:</strong> {row.latest?.latest_article_date || 'Not set'}
            </p>
            <p>
              <strong>Latest link:</strong>{' '}
              {row.latest?.latest_article_url ? (
                <a href={row.latest.latest_article_url} target="_blank" rel="noreferrer">
                  {row.latest.latest_article_url}
                </a>
              ) : (
                'Not set'
              )}
            </p>
            <p>
              <strong>Last verified:</strong>{' '}
              {row.latest?.last_verified_at ? new Date(row.latest.last_verified_at).toLocaleString() : 'Never'}
            </p>
            <p>
              <strong>Latest approved summary:</strong>{' '}
              {row.latestApprovedSubmission?.article_ai_results?.summary || 'No approved summary found'}
            </p>
            <p>
              <strong>Approved categories:</strong> {categories}
            </p>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => void toggleHistory(row.id)}>
                {isOpen ? 'Hide history' : 'Show history'}
              </button>
            </div>
            {isOpen && (
              <div style={{ marginTop: '0.75rem' }}>
                {historyLoading === row.id && <p className="muted">Loading…</p>}
                {history && history.length === 0 && <p className="muted">No submissions yet.</p>}
                {history && history.length > 0 && (
                  <ul style={{ paddingLeft: '1rem' }}>
                    {history.map((h) => (
                      <li key={h.id} style={{ marginBottom: '0.35rem' }}>
                        <span className="muted">{new Date(h.created_at).toLocaleString()}</span>
                        {' · '}
                        <strong>{h.review_status}</strong>
                        {h.matched_current_record ? ' · match' : ' · mismatch'}
                        {' · '}
                        {h.profiles?.email || 'unknown'}
                        {h.submitted_article_title ? ` — ${h.submitted_article_title}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
