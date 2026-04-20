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

interface SiteLatestRow {
  site_id: string;
  latest_article_title: string | null;
  latest_article_date: string | null;
  latest_article_url: string | null;
}

interface SiteDraft extends SiteRow {
  latest_article_title: string;
  latest_article_date: string;
  latest_article_url: string;
}

export default function AdminSitesPage() {
  const [territories, setTerritories] = useState<TerritoryRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [territoryForm, setTerritoryForm] = useState({ code: '', name: '' });
  const [siteForm, setSiteForm] = useState({ territory_id: '', label: '', source_url: '', instructions: '' });
  const [territoryDrafts, setTerritoryDrafts] = useState<Record<string, TerritoryRow>>({});
  const [siteDrafts, setSiteDrafts] = useState<Record<string, SiteDraft>>({});

  const load = async () => {
    const [{ data: territoryData }, { data: siteData }, { data: latestData }] = await Promise.all([
      supabase.from('territories').select('id,code,name,active').order('name', { ascending: true }),
      supabase.from('sites').select('id,label,source_url,instructions,active,territory_id').order('label', { ascending: true }),
      supabase.from('site_latest_articles').select('site_id,latest_article_title,latest_article_date,latest_article_url')
    ]);

    const territoryRows = territoryData ?? [];
    const siteRows = siteData ?? [];
    const latestBySite = new Map((latestData as SiteLatestRow[] | null | undefined)?.map((row) => [row.site_id, row]) ?? []);

    setTerritories(territoryRows);
    setSites(siteRows);
    setTerritoryDrafts(Object.fromEntries(territoryRows.map((row) => [row.id, row])));
    setSiteDrafts(
      Object.fromEntries(
        siteRows.map((row) => {
          const latest = latestBySite.get(row.id);
          return [
            row.id,
            {
              ...row,
              latest_article_title: latest?.latest_article_title ?? '',
              latest_article_date: latest?.latest_article_date ?? '',
              latest_article_url: latest?.latest_article_url ?? ''
            }
          ];
        })
      )
    );
    setSiteForm((current) => ({
      ...current,
      territory_id: current.territory_id || territoryRows[0]?.id || ''
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

  const saveTerritory = async (id: string) => {
    const draft = territoryDrafts[id];
    if (!draft) return;
    await supabase
      .from('territories')
      .update({ code: draft.code.toUpperCase(), name: draft.name, active: draft.active })
      .eq('id', id);
    await load();
  };

  const saveSite = async (id: string) => {
    const draft = siteDrafts[id];
    if (!draft) return;

    await supabase
      .from('sites')
      .update({
        label: draft.label,
        source_url: draft.source_url,
        instructions: draft.instructions || null,
        territory_id: draft.territory_id,
        active: draft.active
      })
      .eq('id', id);

    await supabase.from('site_latest_articles').upsert({
      site_id: id,
      latest_article_title: draft.latest_article_title.trim() || null,
      latest_article_date: draft.latest_article_date || null,
      latest_article_url: draft.latest_article_url.trim() || null
    });

    await load();
  };

  return (
    <main>
      <h1>Admin: Territories & Sites</h1>

      <section className="admin-grid admin-grid--two">
        <article className="card">
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
        </article>

        <article className="card">
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
        </article>
      </section>

      <section className="card">
        <h2>Territories</h2>
        <div className="stack">
          {territories.map((territory) => {
            const draft = territoryDrafts[territory.id] ?? territory;
            return (
              <article className="row row--card" key={territory.id}>
                <div className="split split--equal">
                  <input
                    value={draft.code}
                    onChange={(e) =>
                      setTerritoryDrafts((current) => ({ ...current, [territory.id]: { ...draft, code: e.target.value.toUpperCase() } }))
                    }
                  />
                  <input
                    value={draft.name}
                    onChange={(e) => setTerritoryDrafts((current) => ({ ...current, [territory.id]: { ...draft, name: e.target.value } }))}
                  />
                </div>
                <div className="actions">
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) =>
                        setTerritoryDrafts((current) => ({ ...current, [territory.id]: { ...draft, active: e.target.checked } }))
                      }
                    />
                    Active
                  </label>
                  <button type="button" onClick={() => void saveTerritory(territory.id)}>
                    Save
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Sites</h2>
        <p className="muted">You can edit both site config and the saved "last checked article" baseline details from here.</p>
        <div className="stack">
          {sites.map((site) => {
            const draft = siteDrafts[site.id];
            if (!draft) return null;

            return (
              <article className="row row--card" key={site.id}>
                <input
                  value={draft.label}
                  onChange={(e) => setSiteDrafts((current) => ({ ...current, [site.id]: { ...draft, label: e.target.value } }))}
                />
                <input
                  value={draft.source_url}
                  onChange={(e) => setSiteDrafts((current) => ({ ...current, [site.id]: { ...draft, source_url: e.target.value } }))}
                />
                <textarea
                  value={draft.instructions ?? ''}
                  onChange={(e) => setSiteDrafts((current) => ({ ...current, [site.id]: { ...draft, instructions: e.target.value || null } }))}
                />
                <select
                  value={draft.territory_id}
                  onChange={(e) => setSiteDrafts((current) => ({ ...current, [site.id]: { ...draft, territory_id: e.target.value } }))}
                >
                  {territories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name} ({territory.code})
                    </option>
                  ))}
                </select>

                <div className="split split--equal">
                  <input
                    placeholder="Latest article title"
                    value={draft.latest_article_title}
                    onChange={(e) => setSiteDrafts((current) => ({ ...current, [site.id]: { ...draft, latest_article_title: e.target.value } }))}
                  />
                  <input
                    type="date"
                    value={draft.latest_article_date}
                    onChange={(e) => setSiteDrafts((current) => ({ ...current, [site.id]: { ...draft, latest_article_date: e.target.value } }))}
                  />
                </div>
                <input
                  placeholder="Latest article URL"
                  value={draft.latest_article_url}
                  onChange={(e) => setSiteDrafts((current) => ({ ...current, [site.id]: { ...draft, latest_article_url: e.target.value } }))}
                />

                <div className="actions">
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => setSiteDrafts((current) => ({ ...current, [site.id]: { ...draft, active: e.target.checked } }))}
                    />
                    Active
                  </label>
                  <button type="button" onClick={() => void saveSite(site.id)}>
                    Save
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
