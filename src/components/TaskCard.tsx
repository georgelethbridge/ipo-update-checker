import { SiteTask } from '../types/db';

export default function TaskCard({ task }: { task: SiteTask }) {
  return (
    <section className="card task-card">
      <div className="task-card__header">
        <p className="badge">{task.territory.code}</p>
        <h2>{task.label}</h2>
      </div>

      <p className="task-card__description">
        Open the source page, find the latest published article, then submit title/date/URL. If it differs from the saved record, you will be shown the last checked details and asked for newer articles since then.
      </p>

      {task.instructions && (
        <p className="instructions">
          <strong>Instructions:</strong> {task.instructions}
        </p>
      )}
    </section>
  );
}
