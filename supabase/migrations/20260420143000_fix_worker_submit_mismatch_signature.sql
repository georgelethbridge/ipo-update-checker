-- Keep both RPC signatures so either schema-cache variant can resolve.
create or replace function _worker_submit_mismatch_impl(
  p_submission_id uuid,
  p_article_text text,
  p_rows jsonb
) returns void language plpgsql security definer as $$
declare
  v_owner uuid;
  v_row jsonb;
  v_idx int := 0;
begin
  select user_id into v_owner from submissions where id = p_submission_id;
  if v_owner is null then raise exception 'submission not found'; end if;
  if v_owner <> auth.uid() then raise exception 'forbidden'; end if;

  update submissions set article_text = p_article_text where id = p_submission_id;

  delete from submission_new_articles where submission_id = p_submission_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    v_idx := v_idx + 1;
    insert into submission_new_articles(
      submission_id, article_order, article_title, article_date, article_url, article_text
    ) values (
      p_submission_id,
      v_idx,
      coalesce(v_row->>'title', ''),
      nullif(v_row->>'date', '')::date,
      nullif(v_row->>'url', ''),
      case when v_idx = 1 then nullif(v_row->>'articleText', '') else null end
    );
  end loop;
end;
$$;

create or replace function worker_submit_mismatch(
  p_submission_id uuid,
  p_article_text text,
  p_rows jsonb
) returns void language sql security definer as $$
  select _worker_submit_mismatch_impl(p_submission_id, p_article_text, p_rows);
$$;

create or replace function worker_submit_mismatch(
  p_article_text text,
  p_rows jsonb,
  p_submission_id uuid
) returns void language sql security definer as $$
  select _worker_submit_mismatch_impl(p_submission_id, p_article_text, p_rows);
$$;

grant execute on function worker_submit_mismatch(uuid, text, jsonb) to authenticated;
grant execute on function worker_submit_mismatch(text, jsonb, uuid) to authenticated;
