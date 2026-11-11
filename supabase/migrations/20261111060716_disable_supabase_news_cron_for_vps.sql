do $$
declare
  crawler_job record;
begin
  for crawler_job in
    select jobid
    from cron.job
    where command like '%trigger-news-crawler%'
  loop
    perform cron.alter_job(crawler_job.jobid, active := false);
  end loop;
end
$$;
