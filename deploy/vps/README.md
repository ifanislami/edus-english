# Tumbuh Academy VPS crawler

The VPS fetches RSS and calls Qwen without the Supabase Edge Function wall-clock limit. The `ingest-news-article` Edge Function only authenticates, validates, de-duplicates, and writes the generated article.

Required `/etc/tumbuhacademy-crawler.env` values:

```dotenv
SUPABASE_INGEST_URL=https://PROJECT_REF.supabase.co/functions/v1/ingest-news-article
CRAWLER_KEY=replace-with-vault-crawler-key
QWEN_API_KEY=replace-with-dashscope-api-key
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
QWEN_MODEL=qwen3.8-max
# Optional licensed Google image fallback. The crawler uses the source article image first.
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_ID=
```

The environment file must be root-owned with mode `0600`. Install the service and timer files under `/etc/systemd/system/`, then run `systemctl daemon-reload` and enable the six `tumbuhacademy-*.timer` units.

Useful checks:

```sh
systemctl list-timers 'tumbuhacademy-*'
journalctl -u 'tumbuhacademy-crawler@*' -n 100 --no-pager
sudo systemctl start tumbuhacademy-crawler@republika-l1.service
```
