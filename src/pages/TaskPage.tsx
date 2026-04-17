import { useEffect, useMemo, useState } from 'react';
import TaskCard from '../components/TaskCard';
import SubmissionForm from '../components/SubmissionForm';
import MismatchArticlesForm from '../components/MismatchArticlesForm';
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

export default function TaskPage() {
  const [userId, setUserId] = useState('');
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [current, setCurrent] = useState<SiteTask | null>(null);
  const [needsMismatch, setNeedsMismatch] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const remaining = useMemo(() => tasks.length, [tasks.length]);

  const loadTasks = async () => {
    const profile = await getMyProfile();
    if (!profile) return;
    setUserId(profile.id);
    const eligible = await getEligibleSitesForUserToday(profile.id);
    setTasks(eligible);
    setCurrent(eligible[0] ?? null);
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const shiftNext = () => {
    const next = tasks.slice(1);
    setTasks(next);
    setCurrent(next[0] ?? null);
    setNeedsMismatch(false);
    setSubmissionId(null);
  };

  const onSubmit = async (article: ArticleInput) => {
    if (!current) return;
    const match = articlesMatch(
      { title: article.title, date: article.date, url: article.url },
      {
        title: current.baseline.latest_article_title,
        date: current.baseline.latest_article_date,
        url: current.baseline.latest_article_url
      }
    );

    const { data, error } = await supabase
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

    if (error) throw error;
    if (match) {
      shiftNext();
      return;
    }

    setSubmissionId(data.id);
    setNeedsMismatch(true);
  };

  const onMismatchSave = async (rows: ArticleInput[]) => {
    if (!submissionId) return;
    await supabase.from('submissions').update({ article_text: rows[0].articleText }).eq('id', submissionId);
    await supabase.from('submission_new_articles').insert(
      rows.map((row, idx) => ({
        submission_id: submissionId,
        article_order: idx + 1,
        article_title: row.title,
        article_date: row.date || null,
        article_url: row.url || null,
        article_text: idx === 0 ? row.articleText : null
      }))
    );
    await supabase.functions.invoke('summarize-article', { body: { submission_id: submissionId } });
    shiftNext();
  };

  if (!current)
    return (
      <main className="center">
        <section className="card empty-state">
          <h2>All done for now</h2>
          <p>No remaining sites for today.</p>
          <p className="muted">Next task window opens in approximately {getTimeUntilReset()} (UTC reset).</p>
          <button onClick={() => void signOut()}>Logout</button>
        </section>
      </main>
    );

  return (
    <main>
      <header className="topbar card">
        <div>
          <h1>Latest Articles</h1>
          <p>{remaining} sites remaining today</p>
        </div>
        <div className="actions">
          <button onClick={() => void signOut()}>Logout</button>
        </div>
      </header>

      <section className="task-layout">
        <div className="task-layout__left">
          <TaskCard task={current} />
          <div className="card">
            <div className="actions">
              <button className="ghost" onClick={() => window.open(current.source_url, '_blank', 'noopener,noreferrer')}>
                Open link
              </button>
              <button className="ghost" onClick={() => shiftNext()}>
                Skip
              </button>
            </div>
          </div>
        </div>
        <div className="task-layout__right">
          {!needsMismatch && <SubmissionForm onSubmit={onSubmit} />}
          {needsMismatch && (
            <MismatchArticlesForm
              baseline={{
                title: current.baseline.latest_article_title,
                date: current.baseline.latest_article_date,
                url: current.baseline.latest_article_url
              }}
              onSave={onMismatchSave}
              onNoUpdates={shiftNext}
            />
          )}
        </div>
      </section>
    </main>
  );
}
