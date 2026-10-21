/* יומן אימונים: תכנון, תמונות, סיכום, בדיקת סדר וארגון והתייעצות לאימון המשך */
const Sessions = (() => {
  const ORG = [
    ['plan', 'הייתה תכנית כתובה עם זמנים לפני האימון'],
    ['gear', 'ציוד ומגרש היו מוכנים לפני שהשחקנים הגיעו'],
    ['start', 'האימון התחיל בזמן'],
    ['goal', 'פתחתי בהסבר קצר של מטרת האימון'],
    ['explain', 'הסבר כל תרגיל לקח פחות מדקה'],
    ['transitions', 'מעברים בין תרגילים היו מהירים (פחות מדקה)'],
    ['groups', 'חלוקה לקבוצות וזוגות הייתה מוכנה מראש'],
    ['active', 'רוב הזמן השחקנים היו בתנועה, בלי טורים ארוכים'],
    ['close', 'סיימתי בזמן עם סיכום קצר ומשוב'],
  ];
  const RATINGS = [['intensity', 'עצימות'], ['fun', 'הנאה ומעורבות'], ['goal', 'השגת המטרה'], ['order', 'סדר וארגון (תחושה)']];
  let filter = { q: '', team: '' };

  const orgScore = s => { const c = s.checklist || {}; const n = ORG.filter(([k]) => c[k]).length; return n ? Math.round(n / ORG.length * 100) : null; };
  const planMinutes = s => (s.plan || []).reduce((a, r) => a + (+r.min || 0), 0);
  const newSession = (patch = {}) => ({ id: DB.uid(), date: U.isoDate(), time: '', team: '', duration: '90', location: '', attendance: '', goal: '', prep: '',
    plan: [], photos: [], worked: '', improve: '', players: '', ratings: {}, checklist: {}, advice: '', question: '', ...patch });

  async function teamList() {
    const s = await DB.settings();
    const fromSessions = (await DB.all('sessions')).map(x => x.team).filter(Boolean);
    return [...new Set([...(s.teams || []), ...fromSessions])];
  }

  /* ---------- רשימה ---------- */
  async function list(view) {
    const all = (await DB.all('sessions')).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const teams = [...new Set(all.map(s => s.team).filter(Boolean))];
    const scored = all.filter(s => orgScore(s) !== null).slice(0, 5);
    const avg = scored.length ? Math.round(scored.reduce((a, s) => a + orgScore(s), 0) / scored.length) : null;
    const month = U.isoDate().slice(0, 7);
    view.innerHTML = `
      <div class="page-head">
        <div><h1>יומן אימונים</h1>
          <div class="stat-row">
            <div class="stat"><b>${all.filter(s => s.date.startsWith(month)).length}</b><span>אימונים החודש</span></div>
            <div class="stat"><b>${avg === null ? '—' : avg + '%'}</b><span>סדר וארגון, 5 אחרונים</span></div>
          </div></div>
        <button class="btn primary" id="new">${U.icon('plus', 18)} אימון חדש</button>
      </div>
      ${all.length ? `<div class="stack" style="margin-bottom:16px">
        <div class="search"><input class="input" id="q" placeholder="חיפוש במטרות, סיכומים ותרגילים" value="${U.esc(filter.q)}">${U.icon('search', 18)}</div>
        ${teams.length > 1 ? `<div class="chips" id="teams"><button class="chip ${!filter.team ? 'on' : ''}" data-t="">כל הקבוצות</button>${teams.map(t => `<button class="chip ${filter.team === t ? 'on' : ''}" data-t="${U.esc(t)}">${U.esc(t)}</button>`).join('')}</div>` : ''}
      </div>` : ''}
      <div id="rows"></div>`;
    const rows = U.$('#rows', view);
    const paint = () => {
      if (!all.length) {
        rows.innerHTML = `<div class="empty"><h3>היומן ריק</h3><p>אחרי כל אימון רושמים מה עשינו, מעלים תמונות, מסמנים את בדיקת הסדר והארגון — ומקבלים הצעה לאימון הבא.</p><button class="btn primary" data-new>רישום האימון הראשון</button></div>`;
        return;
      }
      const q = U.norm(filter.q);
      const L = all.filter(s => (!filter.team || s.team === filter.team) &&
        (!q || U.norm([s.team, s.goal, s.worked, s.improve, s.players, s.prep, ...(s.plan || []).map(p => p.title)].join(' ')).includes(q)));
      rows.innerHTML = L.length ? `<div class="list">${L.map(s => {
        const d = U.parseISO(s.date), sc = orgScore(s);
        return `<a class="session-row" href="#/session/${s.id}">
          <div class="date-block"><b>${d.getDate()}</b><span>${U.MONTHS[d.getMonth()]}</span></div>
          <div style="min-width:0">
            <h3 style="font-family:var(--font-body);font-weight:700">${U.esc(s.team || 'אימון')}${s.time ? ` <span class="muted small">${U.esc(s.time)}</span>` : ''}</h3>
            <div class="muted small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(s.goal || (s.plan || []).map(p => p.title).join(' · ') || 'בלי מטרה רשומה')}</div>
            <div class="row small muted" style="gap:12px;margin-top:2px">${s.plan?.length ? `<span>${s.plan.length} תרגילים</span>` : ''}${s.photos?.length ? `<span>${U.icon('image', 14)} ${s.photos.length}</span>` : ''}${s.advice ? `<span>${U.icon('sparkles', 14)} יש המלצה</span>` : ''}</div>
          </div>
          <div class="score">${sc === null ? '' : sc + '%'}<small>${sc === null ? '' : 'סדר'}</small></div>
        </a>`;
      }).join('')}</div>` : `<div class="empty"><h3>לא נמצאו אימונים</h3></div>`;
    };
    paint();
    const create = async () => { const s = newSession({ team: filter.team || teams[0] || '' }); await DB.put('sessions', s); location.hash = '#/session/' + s.id; };
    U.$('#new', view).onclick = create;
    rows.onclick = e => { if (e.target.closest('[data-new]')) create(); };
    const q = U.$('#q', view); if (q) q.oninput = () => { filter.q = q.value; paint(); };
    const tm = U.$('#teams', view);
    if (tm) tm.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; filter.team = b.dataset.t; U.$$('.chip', tm).forEach(c => c.classList.toggle('on', c === b)); paint(); };
  }

  /* ---------- עריכת אימון ---------- */
  async function edit(view, id) {
    const s = await DB.get('sessions', id);
    if (!s) { view.innerHTML = `<div class="empty"><h3>האימון לא נמצא</h3><a class="btn" href="#/sessions">חזרה ליומן</a></div>`; return; }
    const drills = await DB.all('drills');
    const teams = await teamList();
    const urls = [];

    view.innerHTML = `
      <div class="page-head">
        <div><a href="#/sessions" class="small muted" style="text-decoration:none">${U.icon('back', 14)} יומן אימונים</a>
          <h1 id="title">${U.esc(s.team || 'אימון')} · ${U.fmtDate(s.date)}</h1></div>
        <div class="row"><span class="save-state" id="st">נשמר</span>
          <button class="btn" id="dup" title="פתיחת אימון חדש על בסיס האימון הזה">${U.icon('copy', 18)} אימון המשך</button>
          <button class="btn ghost danger icon" id="del" title="מחיקה">${U.icon('trash', 18)}</button></div>
      </div>
      <div class="grid-2" style="align-items:start">
        <div>
          <div class="panel">
            <div class="panel-head"><h2>פרטים</h2></div>
            <div class="stack">
              <div class="grid-2">
                <label class="field"><span>תאריך</span><input class="input" type="date" data-f="date" value="${s.date}"></label>
                <label class="field"><span>שעה</span><input class="input" type="time" data-f="time" value="${U.esc(s.time)}"></label>
                <label class="field"><span>קבוצה</span><input class="input" data-f="team" list="teams-dl" value="${U.esc(s.team)}" placeholder="למשל ילדים ה׳-ו׳"></label>
                <label class="field"><span>משך מתוכנן (דק׳)</span><input class="input" type="number" min="0" data-f="duration" value="${U.esc(s.duration)}"></label>
                <label class="field"><span>מקום</span><input class="input" data-f="location" value="${U.esc(s.location)}"></label>
                <label class="field"><span>נוכחות</span><input class="input" type="number" min="0" data-f="attendance" value="${U.esc(s.attendance)}" placeholder="כמה שחקנים הגיעו"></label>
              </div>
              <datalist id="teams-dl">${teams.map(t => `<option value="${U.esc(t)}">`).join('')}</datalist>
              <label class="field"><span>מטרת האימון</span><input class="input" data-f="goal" value="${U.esc(s.goal)}" placeholder="מה השחקנים צריכים לצאת איתו"></label>
              <label class="field"><span>הכנה והערות לפני האימון</span><textarea class="input" data-f="prep" rows="3" placeholder="ציוד, חלוקה לקבוצות, דגשים">${U.esc(s.prep)}</textarea></label>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>מבנה האימון</h2>
              <div class="row"><button class="btn sm" id="add-drill">${U.icon('drills', 16)} מהספרייה</button><button class="btn sm" id="add-free">${U.icon('plus', 16)} חלק חופשי</button></div></div>
            <div id="plan"></div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>תמונות מהאימון</h2>
              <label class="btn sm">${U.icon('upload', 16)} העלאה<input type="file" id="ph" accept="image/*" multiple hidden></label></div>
            <div id="photos"></div>
          </div>
        </div>
        <div>
          <div class="panel">
            <div class="panel-head"><h2>סיכום</h2></div>
            <div class="stack">
              <label class="field"><span>מה עבד טוב</span><textarea class="input" data-f="worked" rows="3">${U.esc(s.worked)}</textarea></label>
              <label class="field"><span>מה לשפר</span><textarea class="input" data-f="improve" rows="3">${U.esc(s.improve)}</textarea></label>
              <label class="field"><span>הערות על שחקנים</span><textarea class="input" data-f="players" rows="3">${U.esc(s.players)}</textarea></label>
              <div id="ratings"></div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>בדיקת סדר וארגון</h2><b id="org-score" class="score"></b></div>
            <div class="meter" style="margin-bottom:10px"><i id="org-bar" style="width:0"></i></div>
            <div class="check-list" id="checks">${ORG.map(([k, label]) => `<label class="check-item"><input type="checkbox" data-k="${k}" ${s.checklist?.[k] ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>התייעצות לאימון הבא</h2></div>
            <label class="field"><span>שאלה נוספת (לא חובה)</span><textarea class="input" data-f="question" rows="2" placeholder="למשל: איך לשמור על ריכוז אצל הקטנים בסוף האימון?">${U.esc(s.question)}</textarea></label>
            <div class="row" style="margin-top:12px"><button class="btn primary" id="ask">${U.icon('sparkles', 18)} קבלת המלצות</button></div>
            <div id="advice" style="margin-top:14px"></div>
          </div>
        </div>
      </div>`;

    const st = U.$('#st', view);
    const save = U.debounce(async () => { await DB.put('sessions', s); st.textContent = 'נשמר'; }, 600);
    const touch = () => { st.textContent = 'שומר…'; save(); };
    const setTitle = () => U.$('#title', view).textContent = `${s.team || 'אימון'} · ${U.fmtDate(s.date)}`;
    U.$$('[data-f]', view).forEach(inp => inp.addEventListener('input', () => { s[inp.dataset.f] = inp.value; setTitle(); touch(); if (inp.dataset.f === 'duration') paintPlan(); }));

    /* מבנה */
    function paintPlan() {
      const box = U.$('#plan', view);
      if (!s.plan.length) { box.innerHTML = `<p class="muted small">הוסף תרגילים מהספרייה או חלקים חופשיים (חימום, משחק, סיכום) עם זמנים.</p>`; return; }
      const total = planMinutes(s), target = +s.duration || 0;
      box.innerHTML = s.plan.map((r, i) => `
        <div class="plan-row" data-i="${i}">
          <span class="plan-num">${i + 1}</span>
          <div style="min-width:0">${r.drillId ? `<a class="title" href="#/board/${r.drillId}">${U.esc(r.title)}</a>` : `<input class="input" data-pf="title" value="${U.esc(r.title)}" placeholder="שם החלק" style="min-height:36px;padding:5px 8px">`}</div>
          <input class="input" type="number" min="0" data-pf="min" value="${U.esc(r.min)}" aria-label="דקות" style="min-height:36px;padding:5px 8px" placeholder="דק׳">
          <div class="row" style="gap:2px;flex-wrap:nowrap">
            <button class="btn sm icon ghost" data-mv="-1" title="למעלה" ${i === 0 ? 'disabled' : ''}>${U.icon('up', 16)}</button>
            <button class="btn sm icon ghost" data-mv="1" title="למטה" ${i === s.plan.length - 1 ? 'disabled' : ''}>${U.icon('down', 16)}</button>
            <button class="btn sm icon ghost danger" data-rm title="הסרה">${U.icon('x', 16)}</button></div>
        </div>`).join('') +
        `<div class="plan-total"><span>סה״כ</span><span style="color:${target && total > target ? 'var(--danger)' : 'inherit'}">${total} דק׳${target ? ` מתוך ${target}` : ''}</span></div>`;
    }
    U.$('#plan', view).addEventListener('input', e => {
      const row = e.target.closest('[data-i]'); if (!row || !e.target.dataset.pf) return;
      s.plan[+row.dataset.i][e.target.dataset.pf] = e.target.value; touch();
      if (e.target.dataset.pf === 'min') { const t = U.$('.plan-total span:last-child', view); const total = planMinutes(s), target = +s.duration || 0; t.textContent = `${total} דק׳${target ? ` מתוך ${target}` : ''}`; t.style.color = target && total > target ? 'var(--danger)' : 'inherit'; }
    });
    U.$('#plan', view).addEventListener('click', e => {
      const b = e.target.closest('button'); const row = e.target.closest('[data-i]'); if (!b || !row) return;
      const i = +row.dataset.i;
      if (b.dataset.mv) { const j = i + +b.dataset.mv; [s.plan[i], s.plan[j]] = [s.plan[j], s.plan[i]]; }
      if (b.hasAttribute('data-rm')) s.plan.splice(i, 1);
      touch(); paintPlan();
    });
    U.$('#add-free', view).onclick = () => { s.plan.push({ id: DB.uid(), title: '', min: '10' }); touch(); paintPlan(); U.$$('#plan [data-pf=title]', view).pop()?.focus(); };
    U.$('#add-drill', view).onclick = () => {
      if (!drills.length) { U.toast('עוד אין תרגילים בספרייה. סרטט תרגיל או הוסף חלק חופשי.'); return; }
      U.modal({
        title: 'בחירת תרגיל', wide: true,
        body: `<div class="search" style="margin-bottom:12px"><input class="input" id="pq" placeholder="חיפוש">${U.icon('search', 18)}</div><div class="cards" id="pick" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))"></div>`,
        onOpen: (m, close) => {
          const paint = () => {
            const q = U.norm(m.querySelector('#pq').value);
            m.querySelector('#pick').innerHTML = drills.filter(d => !q || U.norm(d.name + ' ' + d.tags + ' ' + d.cat).includes(q)).map(d => `
              <button class="drill-card" data-id="${d.id}" style="cursor:pointer;text-align:start;padding:0">
                <span class="thumb" style="display:block">${d.thumb ? `<img src="${d.thumb}" alt="">` : ''}</span>
                <span class="body"><b>${U.esc(d.name || 'ללא שם')}</b><span class="meta">${U.esc([d.cat, d.duration ? d.duration + ' דק׳' : ''].filter(Boolean).join(' · '))}</span></span></button>`).join('');
          };
          paint();
          m.querySelector('#pq').oninput = paint;
          m.querySelector('#pick').onclick = e => {
            const b = e.target.closest('[data-id]'); if (!b) return;
            const d = drills.find(x => x.id === b.dataset.id);
            s.plan.push({ id: DB.uid(), drillId: d.id, title: d.name || 'תרגיל', min: d.duration || '10' });
            touch(); paintPlan(); close(); U.toast('התרגיל נוסף');
          };
        }
      });
    };

    /* תמונות */
    async function paintPhotos() {
      urls.forEach(URL.revokeObjectURL); urls.length = 0;
      const box = U.$('#photos', view);
      if (!s.photos.length) { box.innerHTML = `<p class="muted small">צילום של הלוח, של דף התכנית או של התרגילים בזמן אמת. התמונות נשלחות גם להתייעצות.</p>`; return; }
      const files = await Promise.all(s.photos.map(id => DB.getFile(id)));
      box.innerHTML = `<div class="photos">${files.map((f, i) => {
        if (!f) return '';
        const u = URL.createObjectURL(f.blob); urls.push(u);
        return `<div class="photo"><img src="${u}" alt="תמונה מהאימון" data-view="${i}"><button class="x" data-rm="${i}" aria-label="מחיקת תמונה">${U.icon('x', 14)}</button></div>`;
      }).join('')}</div>`;
    }
    U.$('#photos', view).onclick = async e => {
      const v = e.target.closest('[data-view]'), r = e.target.closest('[data-rm]');
      if (v) U.modal({ title: 'תמונה', wide: true, body: `<div class="lightbox"><img src="${v.src}" alt=""></div>` });
      if (r) {
        if (!await U.confirm('למחוק את התמונה?')) return;
        const [fid] = s.photos.splice(+r.dataset.rm, 1); await DB.del('files', fid); touch(); paintPhotos();
      }
    };
    U.$('#ph', view).onchange = async e => {
      const files = [...e.target.files]; e.target.value = '';
      U.toast(`מעלה ${files.length} תמונות…`);
      for (const f of files) {
        try { const blob = await U.compressImage(f); s.photos.push(await DB.saveFile(blob, f.name)); }
        catch (err) { U.toast(`לא הצלחתי לקרוא את ${f.name}`, true); }
      }
      touch(); paintPhotos();
    };

    /* דירוגים */
    function paintRatings() {
      U.$('#ratings', view).innerHTML = RATINGS.map(([k, label]) => `<div class="rating-row"><span>${label}</span>
        <div class="stars" data-r="${k}">${[1, 2, 3, 4, 5].map(n => `<button class="${(s.ratings[k] || 0) >= n ? 'on' : ''}" data-n="${n}" aria-label="${n} מתוך 5">★</button>`).join('')}</div></div>`).join('');
    }
    U.$('#ratings', view).onclick = e => {
      const b = e.target.closest('[data-n]'); if (!b) return;
      const k = b.closest('[data-r]').dataset.r, n = +b.dataset.n;
      s.ratings[k] = s.ratings[k] === n ? 0 : n; touch(); paintRatings();
    };

    /* סדר וארגון */
    function paintScore() {
      const sc = orgScore(s) ?? 0;
      U.$('#org-score', view).textContent = sc + '%';
      U.$('#org-bar', view).style.width = sc + '%';
    }
    U.$('#checks', view).onchange = e => { const k = e.target.dataset.k; if (!k) return; s.checklist[k] = e.target.checked; touch(); paintScore(); };

    /* התייעצות */
    function paintAdvice() {
      const box = U.$('#advice', view);
      box.innerHTML = s.advice ? `<div class="advice">${U.md(s.advice)}</div>
        <div class="row" style="margin-top:10px"><button class="btn sm" id="next-from-adv">${U.icon('plus', 16)} פתיחת אימון המשך עם ההמלצה</button>
        <button class="btn sm ghost" id="copy-adv">${U.icon('copy', 16)} העתקה</button></div>` : '';
      const n = U.$('#next-from-adv', box); if (n) n.onclick = () => makeNext(true);
      const c = U.$('#copy-adv', box); if (c) c.onclick = async () => { await navigator.clipboard.writeText(s.advice); U.toast('הועתק'); };
    }
    async function buildPrompt() {
      const others = (await DB.all('sessions')).filter(x => x.id !== s.id && x.team && x.team === s.team && x.date <= s.date)
        .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
      const c = s.checklist || {};
      const lines = [
        'אני מאמן כדורסל. הנה סיכום האימון שהעברתי. אשמח להמלצות לאימון ההמשך ולשיפור הסדר והארגון שלי כמאמן.',
        '', '## פרטי האימון',
        `תאריך: ${U.fmtDate(s.date)}${s.time ? ' בשעה ' + s.time : ''}`,
        `קבוצה: ${s.team || 'לא צוין'}`, `משך מתוכנן: ${s.duration || '?'} דקות`, s.attendance ? `נוכחות: ${s.attendance} שחקנים` : '',
        s.goal ? `מטרה: ${s.goal}` : '', s.prep ? `הכנה: ${s.prep}` : '',
        '', '## מבנה האימון',
        ...(s.plan.length ? s.plan.map((r, i) => {
          const d = r.drillId && drills.find(x => x.id === r.drillId);
          return `${i + 1}. ${r.title || 'חלק'} — ${r.min || '?'} דק׳${d?.desc ? ` (${d.desc.replace(/\n/g, ' ').slice(0, 160)})` : ''}`;
        }) : ['לא נרשם']),
        '', '## סיכום',
        `מה עבד: ${s.worked || '—'}`, `מה לשפר: ${s.improve || '—'}`, s.players ? `הערות על שחקנים: ${s.players}` : '',
        `דירוגים (1-5): ${RATINGS.map(([k, l]) => `${l}: ${s.ratings[k] || '—'}`).join(', ')}`,
        '', `## בדיקת סדר וארגון (${orgScore(s) ?? 0}%)`,
        ...ORG.map(([k, l]) => `${c[k] ? '✓' : '✗'} ${l}`),
      ];
      if (others.length) {
        lines.push('', '## אימונים קודמים של הקבוצה');
        others.forEach(o => lines.push(`- ${U.fmtShort(o.date)}: מטרה — ${o.goal || '—'}; לשפר — ${o.improve || '—'}; סדר וארגון ${orgScore(o) ?? '—'}%`));
      }
      if (s.photos.length) lines.push('', `מצורפות ${s.photos.length} תמונות מהאימון.`);
      if (s.question) lines.push('', '## שאלה נוספת', s.question);
      lines.push('', '## מה אני מבקש',
        '1. ניתוח קצר: מה הולך טוב ומה הדבר החשוב ביותר לתקן.',
        `2. הצעה מלאה לאימון ההמשך (${s.duration || 90} דקות): חלקים, זמנים, ארגון ונקודות לימוד.`,
        '3. שלושה הרגלים מעשיים לשיפור הסדר והארגון באימון הבא, עם דגש על הסעיפים שסומנו ✗.',
        s.question ? '4. תשובה לשאלה הנוספת.' : '');
      return lines.filter(l => l !== '').join('\n').replace(/\n## /g, '\n\n## ');
    }
    async function photoData() {
      const out = [];
      for (const id of s.photos.slice(0, 4)) {
        const f = await DB.getFile(id); if (!f) continue;
        const small = await U.compressImage(f.blob, 1024, .8);
        out.push((await U.blobToDataURL(small)).split(',')[1]);
      }
      return out;
    }
    U.$('#ask', view).onclick = async () => {
      const btn = U.$('#ask', view);
      const prompt = await buildPrompt();
      const direct = await AI.hasKey();
      btn.disabled = true; btn.innerHTML = direct ? 'Claude חושב…' : btn.innerHTML;
      try {
        const ans = await AI.ask(prompt, direct ? await photoData() : s.photos.map(() => ''));
        if (ans) { s.advice = ans; touch(); paintAdvice(); U.toast('ההמלצה נשמרה'); }
      } catch (e) { U.toast(e.message, true); }
      finally { btn.disabled = false; btn.innerHTML = `${U.icon('sparkles', 18)} קבלת המלצות`; }
    };

    /* אימון המשך */
    async function makeNext(withAdvice) {
      const base = s.date > U.isoDate() ? s.date : U.isoDate();
      const n = newSession({ team: s.team, duration: s.duration, location: s.location, time: s.time, date: U.addDays(s.date, 7) > base ? U.addDays(s.date, 7) : base,
        plan: withAdvice ? [] : s.plan.map(r => ({ ...r, id: DB.uid() })),
        prep: withAdvice && s.advice ? 'המלצות מהאימון הקודם:\n' + s.advice : (s.improve ? 'לשפר מהאימון הקודם: ' + s.improve : '') });
      await DB.put('sessions', n);
      U.toast('נפתח אימון המשך');
      location.hash = '#/session/' + n.id;
    }
    U.$('#dup', view).onclick = () => makeNext(false);
    U.$('#del', view).onclick = async () => {
      if (!await U.confirm('למחוק את האימון ואת התמונות שלו?')) return;
      for (const f of s.photos) await DB.del('files', f);
      await DB.del('sessions', s.id); location.hash = '#/sessions';
    };

    paintPlan(); paintPhotos(); paintRatings(); paintScore(); paintAdvice();
  }

  return { list, edit, orgScore, newSession };
})();
