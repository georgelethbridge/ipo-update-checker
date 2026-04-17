import { SiteTask } from '../types/db';

export default function TaskCard({ task }: { task: SiteTask }) {
  return (
    <section className="card task-card">
      <div className="task-card__header">
        <p className="badge">{task.territory.code}</p>
        <h2>
          {task.territory.name} <span>— {task.label}</span>
        </h2>
      </div>

      <p className="task-card__description">
        Open the source page, find the latest published article, then submit the article title, date, and URL.
      </p>

      <div className="task-card__source">
        <span>Source link to check</span>
        <a href={task.source_url} target="_blank" rel="noreferrer">
          {task.source_url}
        </a>
      </div>

      {task.instructions && (
        <p className="instructions">
          <strong>Instructions:</strong> {task.instructions}
        </p>
      )}
    </section>
  );
}
