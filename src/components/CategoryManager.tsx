import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types/db';

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Category>>({});

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    const rows = data ?? [];
    setCategories(rows);
    setDrafts(Object.fromEntries(rows.map((row) => [row.id, row])));
  };

  useEffect(() => {
    void load();
  }, []);

  const createCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from('categories').insert({ name: name.trim(), sort_order: categories.length + 1, active: true });
    setName('');
    await load();
  };

  const saveCategory = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    await supabase
      .from('categories')
      .update({
        name: draft.name,
        description: draft.description || null,
        sort_order: Number(draft.sort_order),
        active: draft.active
      })
      .eq('id', id);
    await load();
  };

  const shiftCategory = async (id: string, direction: -1 | 1) => {
    const ordered = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((item) => item.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const current = ordered[index];
    const target = ordered[targetIndex];

    await supabase.from('categories').update({ sort_order: target.sort_order }).eq('id', current.id);
    await supabase.from('categories').update({ sort_order: current.sort_order }).eq('id', target.id);
    await load();
  };

  const orderedCategories = useMemo(() => [...categories].sort((a, b) => a.sort_order - b.sort_order), [categories]);

  return (
    <div className="card">
      <h2>Admin: Auto Categories</h2>
      <p className="muted">The number is display order: 1 appears first in category suggestions, then 2, then 3, etc.</p>

      <form onSubmit={createCategory} className="inline-form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" />
        <button type="submit">Add</button>
      </form>

      <div className="stack">
        {orderedCategories.map((category, idx) => {
          const draft = drafts[category.id] ?? category;

          return (
            <article key={category.id} className="row row--card">
              <div className="category-row__top">
                <span className="badge">#{category.sort_order}</span>
                <div className="actions">
                  <button type="button" className="ghost" disabled={idx === 0} onClick={() => void shiftCategory(category.id, -1)}>
                    Move up
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    disabled={idx === orderedCategories.length - 1}
                    onClick={() => void shiftCategory(category.id, 1)}
                  >
                    Move down
                  </button>
                </div>
              </div>
              <div className="split split--equal">
                <input
                  value={draft.name}
                  onChange={(e) => setDrafts((current) => ({ ...current, [category.id]: { ...draft, name: e.target.value } }))}
                />
                <input
                  type="number"
                  min={1}
                  value={draft.sort_order}
                  onChange={(e) =>
                    setDrafts((current) => ({ ...current, [category.id]: { ...draft, sort_order: Number(e.target.value) || 1 } }))
                  }
                />
              </div>
              <input
                value={draft.description ?? ''}
                onChange={(e) => setDrafts((current) => ({ ...current, [category.id]: { ...draft, description: e.target.value } }))}
                placeholder="Description"
              />
              <div className="actions">
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDrafts((current) => ({ ...current, [category.id]: { ...draft, active: e.target.checked } }))}
                  />
                  Active
                </label>
                <button type="button" onClick={() => void saveCategory(category.id)}>
                  Save
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
