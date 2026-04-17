import { useEffect, useMemo, useState } from 'react';
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);

  const load = async () => {
    const [{ data: profiles }, { data: submissions }] = await Promise.all([
      supabase.from('profiles').select('id,email,full_name,role').order('email', { ascending: true }),
      supabase.from('submissions').select('user_id,created_at').order('created_at', { ascending: false })
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

  return (
    <main>
      <h1>Admin: Users & Privileges</h1>
      <section className="card">
        <p>Total users: {users.length}</p>
        <p>Admins: {totals.admins}</p>
        <p>Workers: {totals.workers}</p>
      </section>

      <section className="card">
        <h2>User activity & role management</h2>
        {users.map((user) => (
          <div className="row" key={user.id}>
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
          </div>
        ))}
      </section>
    </main>
  );
}
