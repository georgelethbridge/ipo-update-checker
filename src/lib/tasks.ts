import { supabase } from './supabase';
import { SiteTask } from '../types/db';
import { todayYmd } from './dates';

const shuffle = <T,>(arr: T[]) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const getEligibleSitesForUserToday = async (userId: string): Promise<SiteTask[]> => {
  const dayStart = `${todayYmd()}T00:00:00.000Z`;

  const [{ data: sites, error: sitesError }, { data: doneToday, error: doneError }] = await Promise.all([
    supabase
      .from('sites')
      .select(
        `id,label,source_url,instructions,
        territories(name,code),
        site_latest_articles(latest_article_title,latest_article_date,latest_article_url)`
      )
      .eq('active', true),
    supabase.from('submissions').select('site_id').eq('user_id', userId).gte('created_at', dayStart)
  ]);

  if (sitesError) throw sitesError;
  if (doneError) throw doneError;

  const doneSet = new Set((doneToday ?? []).map((x) => x.site_id));
  const eligible = (sites ?? [])
    .filter((s) => !doneSet.has(s.id))
    .map((s: any) => ({
      id: s.id,
      label: s.label,
      source_url: s.source_url,
      instructions: s.instructions,
      territory: s.territories,
      baseline: s.site_latest_articles ?? {}
    }));

  return shuffle(eligible);
};
