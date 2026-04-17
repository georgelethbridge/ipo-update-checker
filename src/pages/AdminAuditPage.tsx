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

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);

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
          </section>
        );
      })}
    </main>
  );
}
