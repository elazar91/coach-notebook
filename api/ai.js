/* שרת קטן ב-Vercel שמעביר שאלות ל-Claude דרך AI Gateway.
   האימות מול AI Gateway נעשה אוטומטית (OIDC) — אין מפתח בקוד.
   רק מי שמחובר לאתר (טוקן תקף של Supabase) יכול להשתמש בו. */
const SUPABASE_URL = 'https://asauomgvxmzfgpauragb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3cL4fjscOB66U3LovpjDoA_b9IpOrZG';
const MODELS = ['anthropic/claude-haiku-4.5'];

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'POST only' })); }
  try {
    // 1. רק משתמש מחובר
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'צריך להתחבר לאתר' })); }
    const u = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { Authorization: auth, apikey: SUPABASE_KEY } });
    if (!u.ok) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'החיבור פג. התחבר שוב באתר.' })); }

    // 2. השאלה
    const body = await readBody(req);
    const content = [];
    for (const img of (body.images || []).slice(0, 4)) content.push({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + img } });
    content.push({ type: 'text', text: String(body.prompt || '').slice(0, 60000) });
    const messages = [];
    if (body.system) messages.push({ role: 'system', content: String(body.system) });
    messages.push({ role: 'user', content });

    // 3. AI Gateway עם אימות OIDC אוטומטי של Vercel
    const token = req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
    if (!token) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'חיבור ה-AI של Vercel לא זמין בפרויקט' })); }
    let lastErr = '';
    for (const model of MODELS) {
      const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: Math.min(+body.maxTokens || 2500, 4000) }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const text = j.choices?.[0]?.message?.content || '';
        return res.end(JSON.stringify({ text, model }));
      }
      lastErr = j.error?.message || ('HTTP ' + r.status);
    }
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Claude לא ענה: ' + lastErr }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message || 'שגיאה' }));
  }
};
