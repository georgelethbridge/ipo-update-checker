import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const OPENAI_TIMEOUT_MS = 30_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { submission_id } = await req.json();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).single();
    const isAdmin = profile?.role === 'admin';

    const { data: submission } = await admin
      .from('submissions')
      .select('id,user_id,article_text')
      .eq('id', submission_id)
      .single();

    if (!submission || (!isAdmin && submission.user_id !== userData.user.id)) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    if (!isAdmin) {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count } = await admin
        .from('article_ai_results')
        .select('submissions!inner(user_id)', { count: 'exact', head: true })
        .eq('submissions.user_id', userData.user.id)
        .gte('updated_at', since);
      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const articleText = submission.article_text?.trim();
    if (!articleText) return new Response(JSON.stringify({ summary: '', categories: [] }), { headers: corsHeaders });

    const { data: categories } = await admin
      .from('categories')
      .select('id,name')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY missing');

    const prompt = `You summarize IP office updates. Return JSON with fields summary and categories. Categories must be only from: ${categories?.map((c) => c.name).join(', ')}. Article: ${articleText}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const raw = await response.json();
    const content = raw?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
    const allowed = new Map((categories ?? []).map((c) => [c.name, c.id]));
    const selectedCategoryIds = Array.isArray(parsed.categories)
      ? parsed.categories.map((name: string) => allowed.get(name)).filter(Boolean)
      : [];

    const { data: aiResult } = await admin
      .from('article_ai_results')
      .upsert(
        {
          submission_id,
          summary,
          model_name: model,
          raw_response: raw,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'submission_id' }
      )
      .select('id')
      .single();

    if (!aiResult) throw new Error('could not persist ai result');

    await admin.from('article_ai_result_categories').delete().eq('ai_result_id', aiResult.id);
    if (selectedCategoryIds.length) {
      await admin.from('article_ai_result_categories').insert(selectedCategoryIds.map((id) => ({ ai_result_id: aiResult.id, category_id: id })));
    }

    return new Response(
      JSON.stringify({ summary, categories: (categories ?? []).filter((c) => selectedCategoryIds.includes(c.id)).map((c) => c.name) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = (e as Error).message ?? 'unknown error';
    const isTimeout = message.includes('timed out') || (e as Error).name === 'TimeoutError';
    return new Response(
      JSON.stringify({ error: isTimeout ? 'AI request timed out. Please retry.' : message }),
      { status: isTimeout ? 504 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
