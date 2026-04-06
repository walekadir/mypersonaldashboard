// api/recommend.js
// Vercel Serverless Function — proxies requests to Anthropic API
// Solves CORS: browser calls /api/recommend → this calls Anthropic → returns result
//
// SETUP:
// 1. Add this file to your dashboard repo at: api/recommend.js
// 2. In Vercel dashboard → Settings → Environment Variables
//    Add: ANTHROPIC_API_KEY = your_key_here
// 3. Get your free API key at: console.anthropic.com
//
// That's it. No other config needed.

export default async function handler(req, res) {
  // Allow CORS from your dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Vercel environment variables.' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
