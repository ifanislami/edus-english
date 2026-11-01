export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const hasApiKey = Boolean(process.env.QWEN_API_KEY);
  const hasBaseUrl = Boolean(process.env.QWEN_BASE_URL);

  return response.status(hasApiKey ? 200 : 503).json({
    ok: hasApiKey,
    provider: "qwen",
    model: process.env.QWEN_MODEL || "qwen3.8-max",
    baseUrlConfigured: hasBaseUrl,
    message: hasApiKey
      ? "Qwen secret is available to the server."
      : "QWEN_API_KEY is not configured on this deployment.",
  });
}
