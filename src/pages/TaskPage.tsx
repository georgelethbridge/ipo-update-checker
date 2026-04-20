import { useEffect, useMemo, useRef, useState } from 'react';
import TaskCard from '../components/TaskCard';
import SubmissionForm from '../components/SubmissionForm';
import MismatchArticlesForm from '../components/MismatchArticlesForm';
import ErrorBanner from '../components/ErrorBanner';
import { getMyProfile, signOut } from '../lib/auth';
import { getEligibleSitesForUserToday } from '../lib/tasks';
import { articlesMatch } from '../lib/compare';
import { ArticleInput, SiteTask } from '../types/db';
import { supabase } from '../lib/supabase';

const getTimeUntilReset = () => {
  const now = new Date();
  const tomorrowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const msRemaining = tomorrowUtc.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(msRemaining / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const errorMessage = (e: unknown, fallback: string) => {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') {
    return (e as any).message as string;
  }
  return fallback;
};

const isUniqueViolation = (e: unknown) =>
  !!(e && typeof e === 'object' && 'code' in e && (e as any).code === '23505');

export default function TaskPage() {
  const [userId, setUserId] = useState('');
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [current, setCurrent] = useState<SiteTask | null>(null);
  const [needsMismatch, setNeedsMismatch] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetIn, setResetIn] = useState(getTimeUntilReset());
  const skipRef = useRef<HTMLButtonElement | null>(null);

  const remaining = useMemo(() => tasks.length, [tasks.length]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const profile = await getMyProfile();
      if (!profile) return;
      setUserId(profile.id);
      const eligible = await getEligibleSitesForUserToday(profile.id);
      const resumeId = new URLSearchParams(window.location.search).get('resume');
      if (resumeId) {
        const { data: sub } = await supabase
          .from('submissions')
          .select(
            'id,site_id,review_status,matched_current_record,article_text,user_id,sites(id,label,source_url,instructions,territories(name,code),site_latest_articles(latest_article_title,latest_article_date,latest_article_url))'
          )
          .eq('id', resumeId)
          .single();
        const site = (sub as any)?.sites;
        if (
          sub &&
          sub.user_id === profile.id &&
          sub.review_status === 'pending' &&
          sub.matched_current_record === false &&
          !sub.article_text &&
          site
        ) {
          const resumed: SiteTask = {
            id: site.id,
            label: site.label,
            source_url: site.source_url,
            instructions: site.instructions,
            territory: site.territories,
            baseline: site.site_latest_articles ?? ({} as any)
          };
          setTasks([resumed, ...eligible]);
          setCurrent(resumed);
          setSubmissionId(sub.id);
          setNeedsMismatch(true);
          setNotice('Resuming an in-progress mismatch from earlier.');
          return;
        }
      }
      setTasks(eligible);
      setCurrent(eligible[0] ?? null);
    } catch (e) {
      setError(errorMessage(e, 'Could not load tasks. Please refresh.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setResetIn(getTimeUntilReset()), 60_000);
    return () => clearInterval(t);
  }, []);

  const shiftNext = () => {
    const next = tasks.slice(1);
    setTasks(next);
    setCurrent(next[0] ?? null);
    setNeedsMismatch(false);
    setSubmissionId(null);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    if (params.has('resume')) {
      params.delete('resume');
      const q = params.toString();
      window.history.replaceState(null, '', q ? `${window.location.pathname}?${q}` : window.location.pathname);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (busy || !current) return;
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        skipRef.current?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, current]);

  const onSubmit = async (article: ArticleInput) => {
    if (!current || busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const match = articlesMatch(
        { title: article.title, date: article.date, url: article.url },
        {
          title: current.baseline.latest_article_title,
          date: current.baseline.latest_article_date,
          url: current.baseline.latest_article_url
        }
      );

      const { data, error: insertError } = await supabase
        .from('submissions')
        .insert({
          site_id: current.id,
          user_id: userId,
          submitted_article_title: article.title,
          submitted_article_date: article.date || null,
          submitted_article_url: article.url || null,
          matched_current_record: match,
          review_status: match ? 'approved' : 'pending'
        })
        .select('id')
        .single();

      if (insertError) {
        if (isUniqueViolation(insertError)) {
          setNotice('You already submitted this site today. Moving on.');
          shiftNext();
          return;
        }
        throw insertError;
      }

      if (match) {
        shiftNext();
        return;
      }

      setSubmissionId(data.id);
      setNeedsMismatch(true);
      const params = new URLSearchParams(window.location.search);
      params.set('resume', data.id);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    } catch (e) {
      setError(errorMessage(e, 'Could not save submission. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const onMismatchSave = async (rows: ArticleInput[]) => {
    if (!submissionId || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('worker_submit_mismatch', {
        p_submission_id: submissionId,
        p_article_text: rows[0].articleText ?? '',
        p_rows: rows.map((row) => ({
          title: row.title,
          date: row.date || null,
          url: row.url || null,
          articleText: row.articleText ?? ''
        }))
      });
      if (rpcError) throw rpcError;

      try {
        await supabase.functions.invoke('summarize-article', { body: { submission_id: submissionId } });
      } catch {
        setNotice('Submission saved. AI summary will be generated by admin review.');
      }
      shiftNext();
    } catch (e) {
      setError(errorMessage(e, 'Could not save mismatch. Your article text was not lost — please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <main className="center">
        <section className="card empty-state">
          <div className="skeleton" style={{ width: '40%' }} />
          <div className="skeleton" style={{ width: '70%' }} />
          <div className="skeleton" style={{ width: '55%' }} />
        </section>
      </main>
    );
  }

  if (!current)
    return (
      <main className="center">
        <section className="card empty-state">
          <h2>All done for now</h2>
          <p>No remaining sites for today.</p>
          <p className="muted">Next task window opens in approximately {resetIn} (UTC reset).</p>
          <button onClick={() => void signOut()}>Logout</button>
        </section>
      </main>
    );

  return (
    <main>
      <header className="topbar card">
        <div>
          <h1>Latest Articles</h1>
          <p>
            {remaining} sites remaining today · <span className="muted">resets in {resetIn}</span>
          </p>
        </div>
        <div className="actions">
          <button onClick={() => void signOut()}>Logout</button>
        </div>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice && (
        <div className="card muted" role="status">
          {notice}
        </div>
      )}

      <section className="task-layout">
        <div className="task-layout__left">
          <TaskCard task={current} />
          <div className="card">
            <div className="actions">
              <button className="ghost" onClick={() => window.open(current.source_url, '_blank', 'noopener,noreferrer')} disabled={busy}>
                Open link
              </button>
              <button className="ghost" ref={skipRef} onClick={() => shiftNext()} disabled={busy} title="Skip (s)">
                Skip
              </button>
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Shortcut: press <kbd>S</kbd> to skip.
            </p>
          </div>
        </div>
        <div className="task-layout__right">
          {!needsMismatch && <SubmissionForm onSubmit={onSubmit} busy={busy} />}
          {needsMismatch && (
            <MismatchArticlesForm
              baseline={{
                title: current.baseline.latest_article_title,
                date: current.baseline.latest_article_date,
                url: current.baseline.latest_article_url
              }}
              onSave={onMismatchSave}
              onNoUpdates={shiftNext}
              busy={busy}
            />
          )}
        </div>
      </section>
    </main>
  );
}
