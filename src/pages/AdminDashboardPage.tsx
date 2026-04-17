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
    description: 'Manage user access, allow-list entries, and role assignment.',
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
      <p className="muted">Choose a page from the menu or click a tab below.</p>
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
