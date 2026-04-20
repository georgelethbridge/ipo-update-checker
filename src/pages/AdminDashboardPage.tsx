import { Link } from 'react-router-dom';

const OPTIONS = [
  {
    title: 'Submission Reviews',
    description:
      'Review mismatched submissions (including no-new-article escalations), edit summaries/categories, and approve baseline updates.',
    to: '/admin/reviews'
  },
  {
    title: 'Auto Categories',
    description: 'Create, re-order, and toggle categories used for AI/article tagging.',
    to: '/admin/categories'
  },
  {
    title: 'Territories & Sites',
    description: 'Maintain territories and source links, and directly update the stored latest-article details (title/date/URL).',
    to: '/admin/sites'
  },
  {
    title: 'Users & Privileges',
    description: 'Manage user access, allow-list entries, role assignment, and activity history.',
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
      <h1>Admin options</h1>
      <p className="muted">Admins can review checks, manage reference data, and maintain user access from this area.</p>
      <section className="admin-grid">
        {OPTIONS.map((option) => (
          <Link key={option.title} className="card admin-option-card admin-option-card--tab" to={option.to}>
            <h3>{option.title}</h3>
            <p>{option.description}</p>
            <span className="admin-option-card__cta">Open tab →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
