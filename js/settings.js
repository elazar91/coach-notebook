/* הגדרות וגיבוי */
const Settings = (() => {
  async function render(view) {
    const s = await DB.settings();
    let est = null, persisted = false;
    try { est = await navigator.storage?.estimate?.(); persisted = await navigator.storage?.persisted?.(); } catch (e) {}
    view.innerHTML = `
      <div class="page-head"><div><h1>הגדרות</h1></div></div>
      <div class="grid-2" style="align-items:start">
        <div>
          <div class="panel">
            <div class="panel-head"><h2>כללי</h2></div>
            <div class="stack">
              <label class="field"><span>השם שלי</span><input class="input" id="name" value="${U.esc(s.coachName)}"></label>
              <label class="field"><span>הקבוצות שלי</span><input class="input" id="teams" value="${U.esc((s.teams || []).join(', '))}" placeholder="למשל: ילדים ג׳-ד׳, נערים א׳, ליגה ארצית"></label>
              <button class="btn primary" id="save-gen" style="align-self:flex-start">שמירה</button>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>התייעצות עם Claude</h2></div>
            <p class="small">בלי מפתח, האתר מכין את השאלה ופותח את Claude בחלון חדש. עם מפתח API התשובה מגיעה ישר לאימון, כולל ניתוח התמונות.</p>
            <div class="stack">
              <label class="field"><span>מפתח API</span><input class="input" id="key" type="password" dir="ltr" value="${U.esc(s.apiKey)}" placeholder="sk-ant-..." autocomplete="off"></label>
              <label class="field"><span>מודל</span><input class="input" id="model" dir="ltr" value="${U.esc(s.model)}"></label>
              <p class="hint">מפתח יוצרים ב-console.anthropic.com, והשימוש בו בתשלום לפי כמות. המפתח נשמר רק בדפדפן הזה ולא עולה לגיטהאב.</p>
              <div class="row"><button class="btn primary" id="save-ai">שמירה</button><button class="btn" id="test-ai">בדיקת חיבור</button></div>
            </div>
          </div>
        </div>
        <div>
          <div class="panel" id="cloud"></div>
          <div class="panel">
            <div class="panel-head"><h2>גיבוי לקובץ</h2></div>
            <p class="small">יוצר קובץ אחד עם הכל — תרגילים, אימונים, תמונות, מסמכים ומשימות. שימושי כגיבוי נוסף מעבר לענן.</p>
            ${est ? `<p class="small muted">בשימוש: ${U.fmtSize(est.usage || 0)}${persisted ? ' · אחסון קבוע מופעל' : ''}</p>` : ''}
            <div class="row">
              <button class="btn primary" id="exp">${U.icon('download', 18)} הורדת גיבוי</button>
              <label class="btn">${U.icon('upload', 18)} שחזור מגיבוי<input type="file" id="imp" accept="application/json,.json" hidden></label>
            </div>
            ${!persisted && navigator.storage?.persist ? `<button class="btn sm ghost" id="persist" style="margin-top:10px">בקשת אחסון קבוע מהדפדפן</button><p class="small muted">מונע מהדפדפן למחוק נתונים כשהמכשיר מתמלא.</p>` : ''}
          </div>
          <div class="panel">
            <div class="panel-head"><h2>ניקוי המכשיר</h2></div>
            <p class="small">מוחק את הנתונים מהדפדפן הזה בלבד. אם אתה מחובר לענן, הכל יירד מחדש מהגיבוי.</p>
            <button class="btn danger" id="wipe">${U.icon('trash', 18)} מחיקה מהמכשיר</button>
          </div>
        </div>
      </div>`;

    const cloud = U.$('#cloud', view);
    const paintCloud = i => {
      if (!cloud.isConnected) return unsub();
      if (i.status === 'unavailable') {
        cloud.innerHTML = `<div class="panel-head"><h2>גיבוי בענן</h2></div><p class="small">שירות הענן לא נטען. בדוק את החיבור לאינטרנט ורענן את הדף.</p>`;
        return;
      }
      if (!i.email) {
        cloud.innerHTML = `<div class="panel-head"><h2>גיבוי בענן</h2><span class="small"><span class="cloud-dot" style="background:var(--danger)"></span>לא מחובר</span></div>
          <p class="small">אחרי התחברות כל מה ששמור באתר עולה לענן, ומופיע בכל מכשיר שתתחבר בו. אותו אימייל וסיסמה של האתר "סדר את החיים".</p>
          ${i.error ? `<p class="hint" style="color:var(--danger)">${U.esc(i.error)}</p>` : ''}
          <form class="stack" id="login">
            <label class="field"><span>אימייל</span><input class="input" id="em" type="email" dir="ltr" autocomplete="username" value="${U.esc(CONFIG.defaultEmail)}"></label>
            <label class="field"><span>סיסמה</span><input class="input" id="pw" type="password" dir="ltr" autocomplete="current-password"></label>
            <button class="btn primary" type="submit" style="align-self:flex-start">התחברות</button>
          </form>`;
        U.$('#login', cloud).onsubmit = async e => {
          e.preventDefault();
          const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'מתחבר…';
          try { await Sync.signIn(U.$('#em', cloud).value, U.$('#pw', cloud).value); U.toast('מחובר. הנתונים מגובים בענן'); }
          catch (err) { U.toast(err.message, true); b.disabled = false; b.textContent = 'התחברות'; }
        };
        return;
      }
      const st = { ok: ['var(--ok)', 'מגובה'], syncing: ['var(--ball)', 'מסנכרן…'], error: ['var(--danger)', 'הסנכרון נתקע'] }[i.status] || ['var(--muted)', ''];
      cloud.innerHTML = `<div class="panel-head"><h2>גיבוי בענן</h2><span class="small"><span class="cloud-dot" style="background:${st[0]}"></span>${st[1]}</span></div>
        <p class="small">מחובר כ-<b dir="ltr">${U.esc(i.email)}</b>. כל שינוי עולה לענן תוך כמה שניות, ומכשירים אחרים מתעדכנים כשהאתר נפתח בהם.</p>
        <p class="small muted">${i.lastSync ? 'סנכרון אחרון: ' + new Date(i.lastSync).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : ''}${i.pending ? ` · ${i.pending} שינויים ממתינים` : ''}</p>
        ${i.error ? `<p class="hint" style="color:var(--danger)">${U.esc(i.error)}</p>` : ''}
        <div class="row"><button class="btn" id="sync-now">${U.icon('redo', 18)} סנכרון עכשיו</button><button class="btn ghost" id="sign-out">התנתקות</button></div>`;
      U.$('#sync-now', cloud).onclick = () => Sync.run();
      U.$('#sign-out', cloud).onclick = async () => { if (await U.confirm('להתנתק מהענן במכשיר הזה? הנתונים נשארים גם במכשיר וגם בענן.', 'התנתקות')) Sync.signOut(); };
    };
    const unsub = Sync.onChange(paintCloud);

    U.$('#save-gen', view).onclick = async () => {
      await DB.saveSettings({ coachName: U.$('#name', view).value.trim(), teams: U.$('#teams', view).value.split(',').map(x => x.trim()).filter(Boolean) });
      U.toast('נשמר');
    };
    U.$('#save-ai', view).onclick = async () => {
      await DB.saveSettings({ apiKey: U.$('#key', view).value.trim(), model: U.$('#model', view).value.trim() || 'claude-sonnet-5-5' });
      U.toast('נשמר');
    };
    U.$('#test-ai', view).onclick = async () => {
      const s2 = { apiKey: U.$('#key', view).value.trim(), model: U.$('#model', view).value.trim() };
      if (!s2.apiKey) { U.toast('הכנס מפתח קודם', true); return; }
      try { await AI.callAPI(s2, 'ענה במילה אחת: מוכן?', []); U.toast('החיבור עובד'); }
      catch (e) { U.toast(e.message, true); }
    };
    U.$('#exp', view).onclick = async () => {
      const m = U.modal({ title: 'מכין גיבוי…', body: '<div class="progress"><i></i></div>' });
      try {
        const blob = await DB.exportAll((i, n) => m.querySelector('.progress i').style.width = Math.round(i / n * 100) + '%');
        m.close(); U.download(blob, `גיבוי-מחברת-המאמן-${U.isoDate()}.json`);
      } catch (e) { m.close(); U.toast('הגיבוי נכשל: ' + e.message, true); }
    };
    U.$('#imp', view).onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const replace = await U.confirm('להחליף את כל הנתונים הנוכחיים בגיבוי? (ביטול = מיזוג: הגיבוי יתווסף לקיים)', 'החלפה');
      try { await DB.importAll(f, replace); U.toast('השחזור הושלם'); location.hash = '#/home'; }
      catch (err) { U.toast(err.message, true); }
    };
    const p = U.$('#persist', view);
    if (p) p.onclick = async () => { const ok = await navigator.storage.persist(); U.toast(ok ? 'אחסון קבוע הופעל' : 'הדפדפן לא אישר. התקנת האתר למסך הבית בדרך כלל עוזרת.'); render(view); };
    U.$('#wipe', view).onclick = async () => {
      const on = Sync.isOn();
      if (!await U.confirm(on ? 'למחוק את הנתונים מהמכשיר הזה? הגיבוי בענן נשאר, והנתונים יירדו מחדש.' : 'למחוק את כל הנתונים במכשיר הזה? אין גיבוי בענן, ולכן אי אפשר לבטל.', 'מחיקה מהמכשיר')) return;
      await DB.wipe(); U.toast('הנתונים נמחקו מהמכשיר'); if (on) Sync.run(); location.hash = '#/home';
    };
  }
  return { render };
})();
