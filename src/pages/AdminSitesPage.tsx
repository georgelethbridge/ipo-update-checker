import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface TerritoryRow {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

interface SiteRow {
  id: string;
  label: string;
  source_url: string;
  instructions: string | null;
  active: boolean;
  territory_id: string;
}

export default function AdminSitesPage() {
  const [territories, setTerritories] = useState<TerritoryRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [territoryForm, setTerritoryForm] = useState({ code: '', name: '' });
  const [siteForm, setSiteForm] = useState({ territory_id: '', label: '', source_url: '', instructions: '' });

  const load = async () => {
    const [{ data: territoryData }, { data: siteData }] = await Promise.all([
      supabase.from('territories').select('id,code,name,active').order('name', { ascending: true }),
      supabase.from('sites').select('id,label,source_url,instructions,active,territory_id').order('label', { ascending: true })
    ]);

    setTerritories(territoryData ?? []);
    setSites(siteData ?? []);
    setSiteForm((current) => ({
      ...current,
      territory_id: current.territory_id || territoryData?.[0]?.id || ''
    }));
  };

  useEffect(() => {
    void load();
  }, []);

  const createTerritory = async (e: FormEvent) => {
    e.preventDefault();
    if (!territoryForm.code || !territoryForm.name) return;

    await supabase.from('territories').insert({
      code: territoryForm.code.trim().toUpperCase(),
      name: territoryForm.name.trim(),
      active: true
    });

    setTerritoryForm({ code: '', name: '' });
    await load();
  };

  const createSite = async (e: FormEvent) => {
    e.preventDefault();
    if (!siteForm.territory_id || !siteForm.label || !siteForm.source_url) return;

    await supabase.from('sites').insert({
      territory_id: siteForm.territory_id,
      label: siteForm.label.trim(),
      source_url: siteForm.source_url.trim(),
      instructions: siteForm.instructions.trim() || null,
      active: true
    });

    setSiteForm((current) => ({ ...current, label: '', source_url: '', instructions: '' }));
    await load();
  };

  const updateTerritory = async (id: string, patch: Partial<TerritoryRow>) => {
    await supabase.from('territories').update(patch).eq('id', id);
    await load();
  };

  const updateSite = async (id: string, patch: Partial<SiteRow>) => {
    await supabase.from('sites').update(patch).eq('id', id);
    await load();
  };

  return (
    <main>
      <h1>Admin: Territories & Sites</h1>

      <section className="card">
        <h2>Add territory</h2>
        <form onSubmit={createTerritory}>
          <input
            placeholder="Code (e.g. US)"
            value={territoryForm.code}
            onChange={(e) => setTerritoryForm({ ...territoryForm, code: e.target.value })}
            maxLength={8}
            required
          />
          <input
            placeholder="Name"
            value={territoryForm.name}
            onChange={(e) => setTerritoryForm({ ...territoryForm, name: e.target.value })}
            required
          />
          <button type="submit">Add territory</button>
        </form>
      </section>

      <section className="card">
        <h2>Add site</h2>
        <form onSubmit={createSite}>
          <select
            value={siteForm.territory_id}
            onChange={(e) => setSiteForm({ ...siteForm, territory_id: e.target.value })}
            required
          >
            {territories.map((territory) => (
              <option key={territory.id} value={territory.id}>
                {territory.name} ({territory.code})
              </option>
            ))}
          </select>
          <input
            placeholder="Site label"
            value={siteForm.label}
            onChange={(e) => setSiteForm({ ...siteForm, label: e.target.value })}
            required
          />
          <input
            placeholder="Source URL"
            value={siteForm.source_url}
            onChange={(e) => setSiteForm({ ...siteForm, source_url: e.target.value })}
            required
          />
          <textarea
            placeholder="Instructions"
            value={siteForm.instructions}
            onChange={(e) => setSiteForm({ ...siteForm, instructions: e.target.value })}
          />
          <button type="submit">Add site</button>
        </form>
      </section>

      <section className="card">
        <h2>Territories</h2>
        {territories.map((territory) => (
          <div className="row" key={territory.id}>
            <input
              value={territory.code}
              onChange={(e) => updateTerritory(territory.id, { code: e.target.value.toUpperCase() })}
            />
            <input value={territory.name} onChange={(e) => updateTerritory(territory.id, { name: e.target.value })} />
            <label>
              <input
                type="checkbox"
                checked={territory.active}
                onChange={(e) => updateTerritory(territory.id, { active: e.target.checked })}
              />
              Active
            </label>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Sites</h2>
        {sites.map((site) => (
          <div className="row" key={site.id}>
            <input value={site.label} onChange={(e) => updateSite(site.id, { label: e.target.value })} />
            <input value={site.source_url} onChange={(e) => updateSite(site.id, { source_url: e.target.value })} />
            <textarea
              value={site.instructions ?? ''}
              onChange={(e) => updateSite(site.id, { instructions: e.target.value || null })}
            />
            <select value={site.territory_id} onChange={(e) => updateSite(site.id, { territory_id: e.target.value })}>
              {territories.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name} ({territory.code})
                </option>
              ))}
            </select>
            <label>
              <input type="checkbox" checked={site.active} onChange={(e) => updateSite(site.id, { active: e.target.checked })} />
              Active
            </label>
          </div>
        ))}
      </section>
    </main>
  );
}
