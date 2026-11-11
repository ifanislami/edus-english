do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'tumbuh_crawler_cron_key'
  ) then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'tumbuh_crawler_cron_key',
      'Authenticates Supabase Cron calls to trigger-news-crawler'
    );
  end if;
end
$$;

create or replace function public.verify_crawler_cron_key(provided_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select provided_key <> '' and exists (
    select 1
    from vault.decrypted_secrets
    where name = 'tumbuh_crawler_cron_key'
      and extensions.digest(decrypted_secret, 'sha256') =
        extensions.digest(provided_key, 'sha256')
  );
$$;

revoke all on function public.verify_crawler_cron_key(text) from public;
revoke all on function public.verify_crawler_cron_key(text) from anon;
revoke all on function public.verify_crawler_cron_key(text) from authenticated;
grant execute on function public.verify_crawler_cron_key(text) to service_role;

do $$
declare
  crawler_job record;
  updated_command text;
begin
  for crawler_job in
    select jobid, command
    from cron.job
    where jobname like 'tumbuh-%'
      and command like '%/functions/v1/trigger-news-crawler%'
  loop
    updated_command := replace(
      crawler_job.command,
      '''Authorization'', ''Bearer '' || (select decrypted_secret from vault.decrypted_secrets where name = ''tumbuh_crawler_publishable_key'')',
      '''X-Crawler-Key'', (select decrypted_secret from vault.decrypted_secrets where name = ''tumbuh_crawler_cron_key'')'
    );

    if updated_command <> crawler_job.command then
      perform cron.alter_job(crawler_job.jobid, command := updated_command);
    end if;
  end loop;
end
$$;
