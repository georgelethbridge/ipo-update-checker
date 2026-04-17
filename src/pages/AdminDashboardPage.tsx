import { Link } from 'react-router-dom';

const OPTIONS = [
  {
    title: 'Submission Reviews',
    description: 'Review mismatched submissions and approve updates to the latest article baseline.',
    to: '/admin/reviews'
  },
  {
    title: 'Auto Categories',
    description: 'Create, re-order, and toggle categories used for AI/article tagging.',
    to: '/admin/categories'
  },
  {
    title: 'Territories & Sites',
    description: 'Maintain territories and the source links users work from.',
    to: '/admin/sites'
  },
  {
    title: 'Users & Privileges',
    description: 'View worker activity and set user roles (worker/admin).',
    to: '/admin/users'
  },
  {
    title: 'Latest Article Audit',
    description: 'Browse current latest-article records plus approved summaries and categories.',
    to: '/admin/audit'
  }
];

export default function AdminDashboardPage() {
  return (
    <main>
      <h1>Admin Options</h1>
      <p className="muted">Based on the flow: admins can choose between worker tasks and dedicated admin controls.</p>
      <section className="admin-grid">
        {OPTIONS.map((option) => (
          <article key={option.title} className="card admin-option-card">
            <h3>{option.title}</h3>
            <p>{option.description}</p>
            <Link className="button-link" to={option.to}>
              Open option
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
