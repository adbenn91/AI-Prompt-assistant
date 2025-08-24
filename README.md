# AI Prompt Assistant — Vite Pro (OpenRouter)
Modern React + Vite app with preset templates, model picker (Mistral / Qwen / LLaMA via OpenRouter), and two modes:

- **Personal Mode** (frontend uses your OpenRouter API key you paste in Settings)
- **Pro Mode** (secure serverless proxy on Vercel or Netlify; no key in browser)

## Quick Start (Local)
1) Install: `npm install`
2) Run: `npm run dev`
3) Open: http://localhost:5173
4) Click **Settings** → set **Mode: Personal** → paste your **OpenRouter API key**.
5) Choose a template → **Generate Prompt** → **Generate with AI**.

## Deploy to Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Set env var in Site Settings → Build & deploy → Environment:
  - `OPENROUTER_API_KEY=your-key` (for **Pro Mode**)
- We include:
  - `public/_redirects` (SPA fallback)
  - `netlify/functions/openrouter.js` (serverless proxy)
  - `netlify.toml` (build + redirects)

## Deploy to Vercel
- Import the repository in Vercel
- Set Project Settings → Environment Variables:
  - `OPENROUTER_API_KEY=your-key` (for **Pro Mode**)
- We include:
  - `api/openrouter.js` (serverless API route)
  - `vercel.json` (SPA rewrites)

## Why blank page happens & how this project fixes it
- Incorrect publish dir → fixed with `dist`
- SPA refresh 404 → fixed with `_redirects` (Netlify) and `vercel.json` (Vercel)
- Asset path issues → fixed with `vite.config.js` (`base: "/"`)

## Security
Never commit your real API key. Use Pro Mode on Netlify/Vercel to keep keys server-side.
