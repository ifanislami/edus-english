import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GITHUB_REPOSITORY = "ifanislami/edus-english";
const WORKFLOW_FILE = "crawl-news.yml";
const allowedCrawls = new Set([
  "republika-l1",
  "sciencealert-l2",
  "republika-l2",
  "sciencealert-l1",
  "dw-l2",
]);

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "POST required" }, { status: 405 });
  }

  const { crawl } = await request.json().catch(() => ({}));
  if (!allowedCrawls.has(crawl)) {
    return Response.json({ error: "Invalid crawl" }, { status: 400 });
  }

  const token = Deno.env.get("GITHUB_CRAWLER_PAT");
  if (!token) {
    console.error("Missing GITHUB_CRAWLER_PAT");
    return Response.json({ error: "Crawler trigger is not configured" }, { status: 503 });
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "TumbuhAcademy-Supabase-Cron",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { crawl } }),
    },
  );

  if (response.status !== 204) {
    const detail = await response.text();
    console.error("GitHub workflow dispatch failed", response.status, detail);
    return Response.json({ error: "GitHub dispatch failed", status: response.status }, { status: 502 });
  }

  return Response.json({ ok: true, crawl, dispatchedAt: new Date().toISOString() });
});
