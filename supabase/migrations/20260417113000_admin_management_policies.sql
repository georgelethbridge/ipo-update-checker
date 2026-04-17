create policy "admin manage territories" on territories for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin manage sites" on sites for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin manage baseline" on site_latest_articles for all to authenticated using (is_admin()) with check (is_admin());

create policy "admin update profiles" on profiles for update to authenticated using (is_admin()) with check (is_admin());
