create unique index if not exists submissions_unique_per_user_site_day
  on submissions (user_id, site_id, ((created_at at time zone 'UTC')::date));
