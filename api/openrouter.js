export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
  try {
    const { model, messages, temperature = 0.7, max_tokens } = req.body || {};
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.host ? `https://${req.headers.host}` : undefined,
        "X-Title": "AI Prompt Assistant Vite Pro"
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
}
