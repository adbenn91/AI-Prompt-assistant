export async function handler(event) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { statusCode: 500, body: "Missing OPENROUTER_API_KEY" };
    const { model, messages, temperature = 0.7, max_tokens } = JSON.parse(event.body || "{}");
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
  "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "http://localhost:5173",
  "X-Title": "AI Prompt Assistant"
},
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });
    const data = await resp.json();
    return { statusCode: resp.status, headers: { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" }, body: JSON.stringify(data) };
  } catch (e) { return { statusCode: 500, body: e.message }; }
}
