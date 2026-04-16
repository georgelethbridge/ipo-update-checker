import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types/db';

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    setCategories(data ?? []);
  };

  useEffect(() => { void load(); }, []);

  const createCategory = async (e: FormEvent) => {
    e.preventDefault();
    await supabase.from('categories').insert({ name, sort_order: categories.length + 1, active: true });
    setName('');
    await load();
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    await supabase.from('categories').update(patch).eq('id', id);
    await load();
  };

  return (
    <div className="card">
      <h2>Categories</h2>
      <form onSubmit={createCategory}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" /><button>Add</button></form>
      {categories.map((c, idx) => (
        <div key={c.id} className="row">
          <input value={c.name} onChange={(e) => updateCategory(c.id, { name: e.target.value })} />
          <input value={c.description ?? ''} onChange={(e) => updateCategory(c.id, { description: e.target.value })} placeholder="Description" />
          <input type="number" value={c.sort_order} onChange={(e) => updateCategory(c.id, { sort_order: Number(e.target.value) })} />
          <label><input type="checkbox" checked={c.active} onChange={(e) => updateCategory(c.id, { active: e.target.checked })} />Active</label>
          {idx > 0 && <button onClick={() => updateCategory(c.id, { sort_order: idx })}>↑</button>}
        </div>
      ))}
    </div>
  );
}
