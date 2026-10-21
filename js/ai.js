/* התייעצות עם Claude.
   עם מפתח API (בהגדרות) — התשובה מגיעה ישירות לאתר.
   בלי מפתח — האתר מכין את השאלה המלאה, מעתיק אותה ופותח את Claude, ואת התשובה מדביקים בחזרה. */
const AI = (() => {
  const SYSTEM = `אתה מאמן כדורסל בכיר ומדריך מאמנים מנוסה, שעובד עם מאמני נוער בישראל.
אתה עונה בעברית, בגובה העיניים, בצורה מעשית ותמציתית.
כשאתה מציע אימון, אתה כותב מבנה עם זמנים בדקות, שם לכל תרגיל, איך מארגנים אותו (חלוקה, ציוד, מיקום במגרש) ונקודת לימוד אחת או שתיים.
כשאתה מתייחס לסדר וארגון האימון, אתה נותן הרגלים קונקרטיים שאפשר ליישם כבר באימון הבא.`;

  async function callAPI(settings, prompt, images, system) {
    const content = [];
    for (const img of images.slice(0, 4)) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } });
    content.push({ type: 'text', text: prompt });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: settings.model || 'claude-sonnet-5-5', max_tokens: 2500, system: system || SYSTEM, messages: [{ role: 'user', content }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || res.statusText;
      if (res.status === 401) throw new Error('מפתח ה-API לא תקין. בדוק אותו בהגדרות.');
      throw new Error('Claude לא ענה: ' + msg);
    }
    return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  }

  function manualFlow(prompt, imageCount, needsCard = false) {
    return new Promise(resolve => {
      const full = prompt.startsWith(SYSTEM) ? prompt : SYSTEM + '\n\n' + prompt;
      U.modal({
        title: 'התייעצות עם Claude', wide: true,
        body: `<ol class="small" style="padding-inline-start:20px;margin-top:0">
            <li>לוחצים "העתקה ופתיחת Claude" — השאלה המלאה מועתקת ונפתח חלון חדש.</li>
            <li>מדביקים שם${imageCount ? ` ומצרפים את ${imageCount === 1 ? 'התמונה' : imageCount + ' התמונות'} מהאימון` : ''}.</li>
            <li>מעתיקים את התשובה ומדביקים כאן למטה, כדי שתישמר עם האימון.</li></ol>
          <details style="margin:10px 0"><summary class="small muted" style="cursor:pointer">הצגת השאלה שתישלח</summary>
            <textarea class="input" readonly rows="8" style="margin-top:8px;font-size:.85rem">${U.esc(full)}</textarea></details>
          <label class="field"><span>התשובה של Claude</span><textarea class="input" id="ans" rows="8" placeholder="הדבק כאן"></textarea></label>
          ${needsCard ? '<p class="hint" style="margin-top:10px">כדי ש-Claude יענה כאן אוטומטית, צריך להוסיף פעם אחת כרטיס אשראי בחשבון ה-Vercel (לאימות בלבד — לא מחויב, יש 5$ חינם בחודש).</p>' : '<p class="hint" style="margin-top:10px">רוצה שהתשובה תגיע ישר לכאן? התחבר לגיבוי בענן בהגדרות (קוד PIN), ומאז Claude עונה אוטומטית.</p>'}`,
        foot: `<button class="btn primary" data-copy>${U.icon('copy', 18)} העתקה ופתיחת Claude</button>
          <button class="btn dark" data-save>שמירת התשובה</button><button class="btn" data-close>ביטול</button>`,
        onOpen: (m, close) => {
          m.querySelector('[data-copy]').onclick = async () => {
            try { await navigator.clipboard.writeText(full); U.toast('השאלה הועתקה'); } catch (e) { U.toast('ההעתקה נחסמה — העתק ידנית מתוך "הצגת השאלה"', true); }
            window.open('https://claude.ai/new', '_blank', 'noopener');
          };
          m.querySelector('[data-save]').onclick = () => {
            const v = m.querySelector('#ans').value.trim();
            if (!v) { U.toast('הדבק קודם את התשובה', true); return; }
            close(); resolve(v);
          };
          m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => resolve(null)));
        }
      });
    });
  }

  /* דרך האתר ב-Vercel: עובד לכל מי שמחובר לגיבוי בענן, בלי מפתח */
  async function callServer(prompt, images, system) {
    const token = await Sync.token();
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ prompt, images, system: system || SYSTEM }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Claude לא ענה. נסה שוב בעוד רגע.');
    return (j.text || '').trim();
  }

  /* prompt: טקסט השאלה, images: מערך base64 של JPEG (בלי הקידומת) */
  async function ask(prompt, images = [], system) {
    const s = await DB.settings();
    if (s.apiKey) return callAPI(s, prompt, images, system);
    if (Sync.isOn() && location.protocol.startsWith('http') && !/^(localhost|127\.)/.test(location.hostname)) {
      try { return await callServer(prompt, images, system); }
      catch (e) {
        // החיבור האוטומטי עוד לא פעיל (למשל חסר כרטיס ב-Vercel) — ממשיכים בהעתק-הדבק
        if (!/credit card|gateway|לא זמין/i.test(e.message)) throw e;
        return manualFlow((system ? system + '\n\n' : '') + prompt, images.length, true);
      }
    }
    return manualFlow((system ? system + '\n\n' : '') + prompt, images.length);
  }
  /* האם התשובה תגיע ישר לאתר (בלי העתק-הדבק) */
  async function direct() { return !!(await DB.settings()).apiKey || (Sync.isOn() && !/^(localhost|127\.)/.test(location.hostname)); }
  async function hasKey() { return direct(); }

  /* תשובה כ-JSON: מחלץ את האובייקט הראשון מהטקסט */
  function parseJSON(text) {
    if (!text) return null;
    const m = text.match(/\{[\s\S]*\}/);
    try { return JSON.parse(m ? m[0] : text); } catch (e) { return null; }
  }

  return { ask, hasKey, direct, callAPI, parseJSON, SYSTEM };
})();
