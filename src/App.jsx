import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Copy, Settings, Sun, Moon, Shield, Rocket } from "lucide-react";

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

function useTheme() {
  const [theme, setTheme] = useLocalStorage("theme", "dark");
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);
  return [theme, setTheme];
}

const DEFAULT = {
  targetModel: "chatgpt",
  taskType: "writing",
  userGoal: "",
  audience: "",
  tone: "neutral",
  length: 600,
  constraints: "",
  mustInclude: "",
  avoid: "",
  format: "markdown",
  includeThoughtProcess: false,
  persona: "",
  examples: "",
  languages: "English",
  steps: true,
  guardrails: true,
};

const PROVIDERS = [
  {
    id: "openrouter",
    label: "OpenRouter",
    models: [
      { id: "mistralai/mistral-small-3.2-24b-instruct:free", label: "Mistral Small 3.2 24B (free)" },
      { id: "openai/gpt-oss-20b:free", label: "OpenAI GPT-OSS 20B (free)" },
      { id: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1 0528 (free)" },
    ],
  },
];

async function callOpenRouter({ apiKey, model, prompt, temperature = 0.7, max_tokens = 800 }) {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "AI Prompt Assistant Vite Pro",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${text.slice(0, 180)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [form, setForm] = useState(DEFAULT);
  const [result, setResult] = useState("");
  const [chat, setChat] = useState([]);
  const chatRef = useRef(null);

  const [settings, setSettings] = useLocalStorage("ai_pa_vite_settings", {
    mode: "personal",
    model: PROVIDERS[0].models[0].id,
    temperature: 0.7,
    openrouterKey: "",
  });

  const canGenerate = useMemo(() => form.userGoal.trim().length > 3, [form.userGoal]);
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  async function runAI() {
    const prompt = result;
    setChat((prev) => [...prev, { role: "user", content: prompt }, { role: "ai", content: "⏳ Generating..." }]);
    try {
      if (!settings.openrouterKey) throw new Error("❌ Missing OpenRouter API key in Settings.");
      const text = await callOpenRouter({
        apiKey: settings.openrouterKey,
        model: settings.model,
        prompt,
        temperature: isNaN(settings.temperature) ? 0.7 : settings.temperature,
      });
      setChat((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "ai", content: text };
        return copy;
      });
    } catch (e) {
      setChat((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "ai", content: "❌ " + e.message };
        return copy;
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      <header className="p-4 flex justify-between items-center bg-gray-800 shadow-md">
        <h1 className="text-lg font-bold flex items-center gap-2">🤖 AI Prompt Assistant</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="flex flex-1 p-4 gap-4">
        {/* Left Sidebar */}
        <aside className="w-64 bg-gray-800 p-4 rounded-lg space-y-4">
          <h2 className="font-semibold">Model Settings</h2>
          <label className="text-sm">Model</label>
          <select
            className="w-full bg-gray-700 p-2 rounded"
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          >
            {PROVIDERS[0].models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          <label className="text-sm mt-2">Temperature</label>
          <input
            className="w-full bg-gray-700 p-2 rounded"
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) || 0.7 })}
          />

          <label className="text-sm mt-2">API Key</label>
          <input
            type="password"
            className="w-full bg-gray-700 p-2 rounded"
            placeholder="sk-or-v1-..."
            value={settings.openrouterKey}
            onChange={(e) => setSettings({ ...settings, openrouterKey: e.target.value })}
          />
        </aside>

        {/* Content */}
        <section className="flex-1 bg-gray-800 p-4 rounded-lg flex flex-col gap-4">
          <textarea
            className="w-full p-2 bg-gray-700 rounded"
            placeholder="Enter your goal..."
            value={form.userGoal}
            onChange={(e) => setForm({ ...form, userGoal: e.target.value })}
          />

          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50"
              disabled={!canGenerate}
              onClick={() => setResult(`Task: ${form.userGoal}\nTone: ${form.tone}`)}
            >
              <Sparkles size={16} /> Generate Prompt
            </button>
            <button
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 disabled:opacity-50"
              disabled={!result}
              onClick={runAI}
            >
              <Rocket size={16} /> Run AI
            </button>
            <button
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
              disabled={!result}
              onClick={() => navigator.clipboard.writeText(result)}
            >
              <Copy size={16} /> Copy
            </button>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Generated Prompt</h3>
            <pre className="bg-gray-700 p-2 rounded text-sm whitespace-pre-wrap">{result}</pre>
          </div>

          <div>
            <h3 className="font-semibold mb-1">AI Output</h3>
            <div
              ref={chatRef}
              className="bg-gray-700 p-2 rounded text-sm whitespace-pre-wrap h-64 overflow-y-auto space-y-2"
            >
              {chat.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-blue-300" : "text-green-300"}>
                  <strong>{m.role === "user" ? "You:" : "AI:"}</strong> {m.content}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

