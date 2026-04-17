import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Role } from '../types/db';

interface UserWithStats {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  submissionCount: number;
  lastSubmissionAt: string | null;
}

interface AllowedUser {
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [allowForm, setAllowForm] = useState({ email: '', role: 'worker' as Role });

  const load = async () => {
    const [{ data: profiles }, { data: submissions }, { data: allowed }] = await Promise.all([
      supabase.from('profiles').select('id,email,full_name,role').order('email', { ascending: true }),
      supabase.from('submissions').select('user_id,created_at').order('created_at', { ascending: false }),
      supabase.from('allowed_users').select('email,role,active,created_at').order('created_at', { ascending: false })
    ]);

    const statsByUser = new Map<string, { submissionCount: number; lastSubmissionAt: string | null }>();
    (submissions ?? []).forEach((submission) => {
      const existing = statsByUser.get(submission.user_id) ?? { submissionCount: 0, lastSubmissionAt: null };
      statsByUser.set(submission.user_id, {
        submissionCount: existing.submissionCount + 1,
        lastSubmissionAt: existing.lastSubmissionAt ?? submission.created_at
      });
    });

    const rows = (profiles ?? []).map((profile) => ({
      ...profile,
      role: (profile.role ?? 'worker') as Role,
      submissionCount: statsByUser.get(profile.id)?.submissionCount ?? 0,
      lastSubmissionAt: statsByUser.get(profile.id)?.lastSubmissionAt ?? null
    }));

    setUsers(rows);
    setAllowedUsers((allowed as AllowedUser[]) ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(
    () => ({
      admins: users.filter((user) => user.role === 'admin').length,
      workers: users.filter((user) => user.role === 'worker').length
    }),
    [users]
  );

  const updateRole = async (id: string, role: Role) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    await load();
  };

  const addAllowedUser = async (e: FormEvent) => {
    e.preventDefault();
    const email = allowForm.email.trim().toLowerCase();
    if (!email) return;

    await supabase.from('allowed_users').upsert({ email, role: allowForm.role, active: true });
    setAllowForm({ email: '', role: 'worker' });
    await load();
  };

  const updateAllowedUser = async (email: string, patch: Partial<AllowedUser>) => {
    await supabase.from('allowed_users').update(patch).eq('email', email);
    await load();
  };

  return (
    <main>
      <h1>Admin: Users & Privileges</h1>
      <section className="card">
        <p>Total users: {users.length}</p>
        <p>Admins: {totals.admins}</p>
        <p>Workers: {totals.workers}</p>
      </section>

      <section className="card">
        <h2>Allow users</h2>
        <p className="muted">Add an email to pre-approve access and set the default role applied at first sign-in.</p>
        <form className="inline-form" onSubmit={addAllowedUser}>
          <input
            type="email"
            required
            placeholder="name@company.com"
            value={allowForm.email}
            onChange={(e) => setAllowForm((current) => ({ ...current, email: e.target.value }))}
          />
          <select value={allowForm.role} onChange={(e) => setAllowForm((current) => ({ ...current, role: e.target.value as Role }))}>
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit">Allow user</button>
        </form>

        <div className="stack">
          {allowedUsers.map((user) => (
            <article className="row row--card" key={user.email}>
              <p>
                <strong>{user.email}</strong>
              </p>
              <div className="actions">
                <select value={user.role} onChange={(e) => void updateAllowedUser(user.email, { role: e.target.value as Role })}>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={user.active}
                    onChange={(e) => void updateAllowedUser(user.email, { active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>User activity & role management</h2>
        <div className="stack">
          {users.map((user) => (
            <article className="row row--card" key={user.id}>
              <p>
                <strong>{user.full_name || user.email || user.id}</strong>
                <br />
                <span className="muted">{user.email}</span>
              </p>
              <p>
                Submissions: {user.submissionCount}
                <br />
                Last activity: {user.lastSubmissionAt ? new Date(user.lastSubmissionAt).toLocaleString() : 'No submissions yet'}
              </p>
              <label>
                Role
                <select value={user.role} onChange={(e) => updateRole(user.id, e.target.value as Role)}>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
