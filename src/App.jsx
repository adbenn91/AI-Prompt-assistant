import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Copy, Settings, Sun, Moon, Shield, Rocket } from "lucide-react";

function useLocalStorage(key, initial){
  const [state,setState] = useState(()=>{
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }catch{ return initial; }
  });
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(state)); }catch{} },[key,state]);
  return [state,setState];
}

function useTheme(){
  const [theme,setTheme] = useLocalStorage("theme","dark");
  useEffect(()=>{ document.documentElement.classList.toggle("light", theme === "light"); },[theme]);
  return [theme,setTheme];
}

const DEFAULT = { targetModel:"chatgpt", taskType:"writing", userGoal:"", audience:"", tone:"neutral", length:600, constraints:"", mustInclude:"", avoid:"", format:"markdown", includeThoughtProcess:false, persona:"", examples:"", languages:"English", steps:true, guardrails:true };

const TEMPLATES = [
  { id:"seo", name:"SEO Blog Post", hint:"H2/H3 + FAQs", data:{...DEFAULT, taskType:"writing", tone:"friendly", userGoal:"Write a 1200-word SEO blog post about 'best time to visit Bali' for budget travelers with H2/H3 and FAQs.", audience:"Budget-conscious travelers", constraints:"Use real months/seasons; include 3 money-saving tips; add internal link placeholders.", mustInclude:"Primary keyword: best time to visit Bali", length:1200 }},
  { id:"email", name:"Email Copy", hint:"Outreach + CTA", data:{...DEFAULT, taskType:"writing", tone:"professional", userGoal:"Draft a concise outreach email proposing collaboration with a travel blogger, with a clear CTA to schedule a call.", audience:"Travel blogger (content creator)", constraints:"Max 180 words; include subject line; avoid pushy tone", mustInclude:"2 proposed call times; signature placeholder", length:180 }},
  { id:"midjourney", name:"MidJourney Prompt", hint:"Cinematic", data:{...DEFAULT, targetModel:"midjourney", taskType:"image", userGoal:"Create a vivid prompt for a cinematic night-time street scene in Tokyo with neon reflections after rain, 35mm look.", constraints:"Include aspect ratio and quality suffix", mustInclude:"--ar 3:2 --quality 2", length:120 }},
  { id:"ideas", name:"Idea Generator", hint:"10 hooks", data:{...DEFAULT, taskType:"analysis", tone:"playful", userGoal:"Brainstorm 10 TikTok content ideas about budget travel hacks in Europe.", audience:"Young travelers", constraints:"Each idea under 25 words; include a hook; avoid repetition", length:300 }},
  { id:"youtube", name:"YouTube Script", hint:"Hook → CTA", data:{...DEFAULT, taskType:"writing", tone:"friendly", userGoal:"Write a 5-minute YouTube script about 'Top 7 hidden gems in Istanbul' with hook, segments, and CTA.", audience:"Travel enthusiasts", constraints:"Short sentences; time stamps; end with subscribe CTA", length:800 }},
  { id:"ecom", name:"E-commerce Product Page", hint:"Benefits → FAQ", data:{...DEFAULT, taskType:"marketing", tone:"persuasive", userGoal:"Write product page copy for a minimalist travel backpack with hero, features, specs, social proof, and FAQ.", audience:"Digital nomads & travelers", constraints:"Keep under 450 words; benefit-first; scannable bullets", length:450 }},
];

function buildPrompt(d){
  const modelHints = { chatgpt:"You are ChatGPT (GPT-5 Thinking).", claude:"You are Claude. Keep responses grounded and structured.", gemini:"You are Google Gemini. Provide concise, factual, and safe outputs.", midjourney:"You are a prompt engineer crafting image prompts for Midjourney.", stable:"You are crafting prompts for Stable Diffusion." };
  const header = `Role: ${modelHints[d.targetModel] || "You are an expert assistant."}\n`;
  const task = `Task: ${d.taskType}\nUser goal: ${d.userGoal || "(fill from context)"}\nTarget audience: ${d.audience || "general"}\nPreferred tone: ${d.tone}\nPreferred language(s): ${d.languages}\nLength guidance: ~${d.length} words (if applicable)\n`;
  const constraints = [ d.constraints && `Constraints: ${d.constraints}`, d.mustInclude && `Must include: ${d.mustInclude}`, d.avoid && `Avoid: ${d.avoid}`, d.guardrails && `Guardrails: Avoid unsafe, copyrighted, or private data. Respect policies.` ].filter(Boolean).join("\n");
  const persona = d.persona ? `Persona: ${d.persona}\n` : "";
  const examples = d.examples ? `\nFew-shot examples (for style/format only):\n${d.examples}\n` : "";
  const outputFormat = `Output format: ${d.format}. If JSON, return valid JSON only. If markdown, use clear headings and lists.`;
  const reasoning = d.includeThoughtProcess ? "\nYou may include brief bullet-point reasoning to show steps taken." : "\nDo NOT reveal hidden chain-of-thought; give only final answer and short justifications if needed.";
  const steps = d.steps ? `\nProcess:\n1) Clarify missing details with short, pointed questions (max 3).\n2) Draft the output.\n3) Self-check for accuracy, relevance, and policy safety.\n4) Provide the final output in the requested format.` : "";
  return [header, persona, task, constraints && constraints + "\n", outputFormat, reasoning, steps, examples].filter(Boolean).join("\n");
}

const PROVIDERS = [
  { id:"openrouter", label:"OpenRouter", models:[
    { id:"mistralai/mistral-small-3.2-24b-instruct:free", label:"Mistral: Mistral Small 3.2 24B (free)" },
    { id:"openai/gpt-oss-20b:free", label:"OpenAI: gpt-oss-20b (free)" },
    { id:"deepseek/deepseek-r1-0528:free", label:"DeepSeek: R1 0528 (free)" },
  ]},
];

async function callOpenRouter({ apiKey, model, prompt, temperature=0.7, max_tokens }){
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:"POST",
    headers:{ "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json", "HTTP-Referer": window.location.origin, "X-Title":"AI Prompt Assistant Vite Pro" },
    body: JSON.stringify({ model, messages:[{role:"user", content:prompt}], temperature, max_tokens })
  });
  if(!resp.ok){
    const text = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${text.slice(0,180)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callViaProxy({ model, prompt, temperature=0.7, max_tokens }){
  const resp = await fetch("/api/openrouter", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ model, messages:[{role:"user", content:prompt}], temperature, max_tokens })
  });
  if(!resp.ok){
    const text = await resp.text();
    throw new Error(`Proxy error ${resp.status}: ${text.slice(0,180)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

export default function App(){
  const [theme,setTheme] = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [form,setForm] = useState(DEFAULT);
  const [result,setResult] = useState("");
  const [chat,setChat] = useState([]);
  const [settings, setSettings] = useLocalStorage("ai_pa_vite_settings", {
    mode:"personal",
    model:PROVIDERS[0].models[0].id,
    temperature:0.7,
    openrouterKey:""
  });

  const canGenerate = useMemo(()=> form.userGoal.trim().length > 3, [form.userGoal]);
  const chatRef = useRef(null);
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chat]);

  const applyTemplate = (tpl)=>{ setForm(tpl.data); setResult(""); };
  const build = ()=>{ const p = buildPrompt(form); setResult(p); return p; };
  const reset = ()=>{ setForm(DEFAULT); setResult(""); };

  async function runAI(){
    const prompt = result || build();
    setChat(prev => [...prev, {role:"user", content: prompt}, {role:"ai", content:"⏳ Generating..."}]);
    try{
      let text = "";
      if(settings.mode === "personal"){
        if(!settings.openrouterKey) throw new Error("Missing OpenRouter API key in Settings.");
        text = await callOpenRouter({ apiKey: settings.openrouterKey, model: settings.model, prompt, temperature: settings.temperature });
      } else {
        text = await callViaProxy({ model: settings.model, prompt, temperature: settings.temperature });
      }
      setChat(prev => { const copy = prev.slice(); copy[copy.length-1] = {role:"ai", content:text}; return copy; });
    } catch(e){
      setChat(prev => { const copy = prev.slice(); copy[copy.length-1] = {role:"ai", content:"❌ " + e.message}; return copy; });
    }
  }

  return (
    <div className={sidebarOpen ? "" : "sidebar-collapsed"}>
      <header className="header">
        <div className="brand">
          <div className="logo">✨</div>
          <div>
            <div className="title">AI Prompt Assistant</div>
          </div>
        </div>
        <div className="toolbar">
          <span className="badge">{settings.mode === "personal" ? "Personal Mode" : "Pro Mode (proxy)"}</span>
          <button className="btn small" onClick={()=>setSidebarOpen(v=>!v)}>{sidebarOpen?"Hide":"Show"} Sidebar</button>
          <button className="btn small" onClick={()=>document.querySelector('#settings').showModal()}><Settings size={16}/> Settings</button>
          <button className="btn small" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>} Theme</button>
        </div>
      </header>

      <main className="wrapper">
        <aside className="sidebar">
          <div className="card">
            <div className="head"><strong>Quick Templates</strong> <span className="badge">1-click</span></div>
            <div className="body">
              {TEMPLATES.map(t => (
                <div key={t.id} className="item">
                  <div>
                    <div className="title" style={{fontSize:14,fontWeight:600}}>{t.name}</div>
                    <div className="hint">{t.hint}</div>
                  </div>
                  <button className="btn small" onClick={()=>applyTemplate(t)}>Use</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="head"><strong>Model</strong> <span className="badge">OpenRouter</span></div>
            <div className="body">
              <label>Choose model</label>
              <select value={settings.model} onChange={e=>setSettings({...settings, model:e.target.value})}>
                {PROVIDERS[0].models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <div style={{height:8}}></div>
              <label>Temperature</label>
              <input type="text" value={settings.temperature} onChange={e=>setSettings({...settings, temperature: parseFloat(e.target.value || "0.7")})} />
              <div className="hint" style={{marginTop:6}}>Set API key in Settings.</div>
            </div>
          </div>
        </aside>

        <section className="content">
          <div className="card">
            <div className="head"><strong>What do you want to achieve?</strong></div>
            <div className="body">
              <div className="controls">
                <div>
                  <label>Your goal</label>
                  <textarea value={form.userGoal} onChange={e=>setForm({...form, userGoal:e.target.value})} placeholder="e.g., Write a 1,000-word blog post about hidden gems in Rome for budget travelers." />
                </div>
                <div>
                  <label>Task type</label>
                  <select value={form.taskType} onChange={e=>setForm({...form, taskType:e.target.value})}>
                    <option value="writing">Writing</option>
                    <option value="coding">Coding</option>
                    <option value="marketing">Marketing</option>
                    <option value="analysis">Analysis/Research</option>
                    <option value="product">Product/UX</option>
                    <option value="image">Image prompt</option>
                  </select>
                </div>
                <div>
                  <label>Target model persona</label>
                  <select value={form.targetModel} onChange={e=>setForm({...form, targetModel:e.target.value})}>
                    <option value="chatgpt">ChatGPT</option>
                    <option value="claude">Claude</option>
                    <option value="gemini">Gemini</option>
                    <option value="midjourney">Midjourney (image)</option>
                    <option value="stable">Stable Diffusion (image)</option>
                  </select>
                </div>
                <div>
                  <label>Tone</label>
                  <select value={form.tone} onChange={e=>setForm({...form, tone:e.target.value})}>
                    <option value="neutral">Neutral</option>
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="playful">Playful</option>
                    <option value="persuasive">Persuasive</option>
                    <option value="concise">Concise</option>
                  </select>
                </div>
                <div className="grid-3" style={{gridColumn:'1 / -1'}}>
                  <div style={{gridColumn:'1 / span 2'}}>
                    <label>Audience</label>
                    <input type="text" value={form.audience} onChange={e=>setForm({...form, audience:e.target.value})} placeholder="e.g., Beginner travelers, CTOs at startups, Instagram audience" />
                  </div>
                  <div>
                    <label>Length guidance (~words)</label>
                    <input type="range" min="50" max="2000" step="50" value={form.length} onChange={e=>setForm({...form, length:parseInt(e.target.value)})} />
                    <div className="hint">{form.length} words</div>
                  </div>
                </div>
              </div>

              <div className="card" style={{marginTop:12}}>
                <div className="head"><strong>Rules & constraints</strong></div>
                <div className="body grid-2">
                  <div>
                    <label>Constraints</label>
                    <textarea value={form.constraints} onChange={e=>setForm({...form, constraints:e.target.value})} placeholder="e.g., Cite sources, use H2/H3, include 3 real examples, avoid plagiarism" />
                  </div>
                  <div>
                    <label>Must include</label>
                    <textarea value={form.mustInclude} onChange={e=>setForm({...form, mustInclude:e.target.value})} placeholder="e.g., brand name, keywords, CTA, links" />
                  </div>
                  <div>
                    <label>Avoid</label>
                    <textarea value={form.avoid} onChange={e=>setForm({...form, avoid:e.target.value})} placeholder="e.g., overly formal tone, clichés, policy-unsafe content" />
                  </div>
                  <div>
                    <label>Output format</label>
                    <select value={form.format} onChange={e=>setForm({...form, format:e.target.value})}>
                      <option value="markdown">Markdown</option>
                      <option value="plain text">Plain text</option>
                      <option value="json">JSON</option>
                      <option value="html">HTML</option>
                    </select>
                  </div>
                  <div style={{gridColumn:'1 / -1'}}>
                    <label><input type="checkbox" checked={form.steps} onChange={e=>setForm({...form, steps:e.target.checked})}/> Ask clarifying questions & self-check</label><br/>
                    <label><input type="checkbox" checked={form.guardrails} onChange={e=>setForm({...form, guardrails:e.target.checked})}/> Safety guardrails</label><br/>
                    <label><input type="checkbox" checked={form.includeThoughtProcess} onChange={e=>setForm({...form, includeThoughtProcess:e.target.checked})}/> Allow brief reasoning</label>
                  </div>
                </div>
              </div>

              <div className="card" style={{marginTop:12}}>
                <div className="head"><strong>Persona & examples</strong></div>
                <div className="body grid-2">
                  <div>
                    <label>Persona</label>
                    <input type="text" value={form.persona} onChange={e=>setForm({...form, persona:e.target.value})} placeholder="e.g., Senior travel writer; Full-stack engineer; Growth marketer" />
                  </div>
                  <div>
                    <label>Language(s)</label>
                    <input type="text" value={form.languages} onChange={e=>setForm({...form, languages:e.target.value})} placeholder="e.g., English, Arabic" />
                  </div>
                  <div style={{gridColumn:'1 / -1'}}>
                    <label>Few-shot examples (optional)</label>
                    <textarea value={form.examples} onChange={e=>setForm({...form, examples:e.target.value})} placeholder={"Example 1 -> Input: ...\nOutput: ...\n---\nExample 2 -> Input: ...\nOutput: ..."} />
                  </div>
                </div>
              </div>

              <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
                <button className="btn primary" disabled={!canGenerate} onClick={build}><Sparkles size={16}/> Generate Prompt</button>
                <button className="btn" onClick={reset}>⟲ Reset</button>
                <button className="btn" onClick={()=>navigator.clipboard.writeText(result || "")} disabled={!result}><Copy size={16}/> Copy</button>
                <button className="btn" onClick={()=>runAI()} disabled={!result}><Rocket size={16}/> Generate with AI</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="head"><strong>Your optimized prompt</strong></div>
            <div className="body">
              <textarea readOnly value={result} placeholder="Your prompt will appear here..." style={{width:'100%',minHeight:180}} />
            </div>
          </div>

          <div className="card">
            <div className="head"><strong>AI output</strong> <span className="badge"><Shield size={12}/> via OpenRouter</span></div>
            <div className="body">
              <div className="chat" ref={chatRef}>
                {chat.length===0 && <div className="badge">No AI messages yet. Click "Generate with AI".</div>}
                {chat.map((m,i)=>(<div key={i} className={`bubble ${m.role==='user'?'user':'ai'}`}>{m.content}</div>))}
              </div>
            </div>
          </div>

          <div className="footer">Built for you • Vite + React • {new Date().getFullYear()}</div>
        </section>
      </main>

      <dialog id="settings" style={{border:'none',borderRadius:16,padding:0,background:'transparent'}}>
        <form method="dialog" className="card" style={{width:'min(720px,94vw)'}}>
          <div className="head"><strong>Settings</strong> <span className="badge">Connection & Advanced</span></div>
          <div className="body">
            <div className="grid-2">
              <div>
                <label>Mode</label>
                <select value={settings.mode} onChange={e=>setSettings({...settings, mode:e.target.value})}>
                  <option value="personal">Personal (browser key)</option>
                  <option value="proxy">Pro (serverless proxy)</option>
                </select>
              </div>
              <div>
                <label>Model (OpenRouter)</label>
                <input type="text" value={settings.model} onChange={e=>setSettings({...settings, model:e.target.value})} />
                <div className="hint" style={{marginTop:6}}>Examples: mistralai/mistral-small, qwen/qwen-2.5-7b-instruct, meta-llama/llama-3.1-70b-instruct</div>
              </div>
              <div>
                <label>Temperature</label>
                <input type="text" value={settings.temperature} onChange={e=>setSettings({...settings, temperature: parseFloat(e.target.value || "0.7")})} />
              </div>
              {settings.mode === "personal" && (
                <div>
                  <label>OpenRouter API Key</label>
                  <input type="text" value={settings.openrouterKey} onChange={e=>setSettings({...settings, openrouterKey:e.target.value})} placeholder="sk-or-v1-..." />
                </div>
              )}
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
              <button className="btn" value="cancel">Close</button>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  )
}
