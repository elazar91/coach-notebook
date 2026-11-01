/* התייעצות עם Claude — בחינם, דרך claude.ai.
   האתר מכין את השאלה המלאה, מעתיק אותה ופותח את Claude, ואת התשובה מדביקים בחזרה.
   אין שום חיבור בתשלום (לא מפתח API ולא AI Gateway). */
const AI = (() => {
  const SYSTEM = `אתה מאמן כדורסל בכיר ומדריך מאמנים מנוסה, שעובד עם מאמני נוער בישראל.
אתה עונה בעברית, בגובה העיניים, בצורה מעשית ותמציתית.
כשאתה מציע אימון, אתה כותב מבנה עם זמנים בדקות, שם לכל תרגיל, איך מארגנים אותו (חלוקה, ציוד, מיקום במגרש) ונקודת לימוד אחת או שתיים.
כשאתה מתייחס לסדר וארגון האימון, אתה נותן הרגלים קונקרטיים שאפשר ליישם כבר באימון הבא.`;

  function manualFlow(prompt, imageCount) {
    return new Promise(resolve => {
      U.modal({
        title: 'שאלה ל-Claude', wide: true,
        body: `<ol class="small" style="padding-inline-start:20px;margin-top:0">
            <li>לוחצים "העתקה ופתיחת Claude" — השאלה מועתקת ו-claude.ai נפתח בחלון חדש.</li>
            <li>מדביקים שם${imageCount ? ` ומצרפים את ${imageCount === 1 ? 'התמונה' : imageCount + ' התמונות'}` : ''}.</li>
            <li>מעתיקים את התשובה ומדביקים כאן, כדי שתישמר באתר.</li></ol>
          <details style="margin:10px 0"><summary class="small muted" style="cursor:pointer">הצגת השאלה</summary>
            <textarea class="input" readonly rows="8" style="margin-top:8px;font-size:.85rem">${U.esc(prompt)}</textarea></details>
          <label class="field"><span>התשובה של Claude</span><textarea class="input" id="ans" rows="8" placeholder="הדבק כאן"></textarea></label>`,
        foot: `<button class="btn primary" data-copy>${U.icon('copy', 18)} העתקה ופתיחת Claude</button>
          <button class="btn dark" data-save>שמירת התשובה</button><button class="btn" data-close>ביטול</button>`,
        onOpen: (m, close) => {
          m.querySelector('[data-copy]').onclick = async () => {
            try { await navigator.clipboard.writeText(prompt); U.toast('השאלה הועתקה'); } catch (e) { U.toast('ההעתקה נחסמה — העתק ידנית מתוך "הצגת השאלה"', true); }
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

  /* prompt: טקסט השאלה; images: רק מספר התמונות משמש, כדי להזכיר לצרף אותן */
  async function ask(prompt, images = [], system) {
    return manualFlow((system || SYSTEM) + '\n\n' + prompt, images.length);
  }
  const hasKey = async () => false;
  const direct = async () => false;

  /* תשובה כ-JSON: מחלץ את האובייקט הראשון מהטקסט */
  function parseJSON(text) {
    if (!text) return null;
    const m = text.match(/\{[\s\S]*\}/);
    try { return JSON.parse(m ? m[0] : text); } catch (e) { return null; }
  }

  return { ask, hasKey, direct, parseJSON, SYSTEM };
})();
