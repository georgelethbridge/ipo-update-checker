import { SiteTask } from '../types/db';

export default function TaskCard({ task }: { task: SiteTask }) {
  return (
    <section className="card">
      <h2>{task.territory.name} — {task.label}</h2>
      <p><strong>Source:</strong> <a href={task.source_url} target="_blank" rel="noreferrer">{task.source_url}</a></p>
      {task.instructions && <p className="instructions">Instructions: {task.instructions}</p>}
      <div className="baseline">
        <h3>Current approved baseline</h3>
        <p><strong>Title:</strong> {task.baseline.latest_article_title || '—'}</p>
        <p><strong>Date:</strong> {task.baseline.latest_article_date || '—'}</p>
        <p><strong>URL:</strong> {task.baseline.latest_article_url || '—'}</p>
      </div>
    </section>
  );
}
