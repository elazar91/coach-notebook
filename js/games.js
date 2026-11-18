/* משחקים והסעות: לוח המשחקים מאתר האיגוד (ibasketball), לוח שנה, והודעות וואטסאפ לנהג, למזכירות ולמאמנים.
   הקבוצות מזוהות מחדש בכל עונה לפי שם המועדון, כך שבמעבר עונה לא צריך לעדכן כלום.
   מספרי הטלפון נשמרים בהגדרות (מגובים בענן), לא בקוד — כי הקוד ציבורי. */
const Games = (() => {
  const API = 'https://ibasketball.co.il/wp-json/sportspress/v2';
  const CACHE_KEY = 'coach-games-v3';
  const MAX_AGE = 3 * 3600e3;            // רענון אוטומטי כל 3 שעות
  const ARRIVE_BEFORE = 35;              // דקות הגעה לפני המשחק

  /* המועדונים שמוצגים בלוח. club = מי שההסעות וההודעות שייכות לו */
  const CLUBS = [
    { key: 'ka', label: 'קרית ארבע', search: 'הר חברון קריה',
      names: ['אליצור הר חברון קריה', 'אליצור קריה הר חברון'], messages: true },
    { key: 'ef', label: 'אפרת', search: 'אפרת',
      names: ['אליצור ג. עציון אפרת', 'אליצור ג.ע. אפרת', 'אליצור ג.עציון/אפרת', 'אליצור גוש עציון אפרת'],
      onlyGroups: ['ילדים ב׳'] },
    { key: 'hj', label: 'הפועל ירושלים', external: true },   // הקבוצה הבוגרת: ליגת Winner, גביע ויורוקאפ
  ];
  /* מאמן לכל שכבה (קרית ארבע) */
  const COACHES = { 'קט-סל א׳': 'נפתלי', 'ילדים ב׳': 'אמיתי' };
  /* זמני נסיעה ידניים מקרית ארבע (דקות). מילת מפתח שמופיעה בשם האולם */
  const TRAVEL = {
    'אורות עציון': 30, 'הגבעה הצהובה': 30, 'אלון שבות': 30, 'גוש עציון': 30, 'אפרת': 30, 'נוקדים': 35,
    'בית לחם הגלילית': 20, 'תקוע': 50, 'נס הרים': 40, 'צור הדסה': 40, 'הרטוב': 45, 'בית וגן': 45,
    'עין כרם': 50, 'ירושלים': 50, 'בית שמש': 50, 'גבעת זאב': 50, 'מודיעין': 55, 'פסגת זאב': 60, 'מעלה אדומים': 70,
  };
  const GROUPS = [
    ['קט סל א בנות', 'קט-סל א׳ בנות'], ['קט סל ב בנות', 'קט-סל ב׳ בנות'],
    ['קט סל א', 'קט-סל א׳'], ['קט סל ב', 'קט-סל ב׳'],
    ['ילדות א', 'ילדות א׳'], ['ילדות ב', 'ילדות ב׳'],
    ['ילדים א', 'ילדים א׳'], ['ילדים ב', 'ילדים ב׳'],
    ['נערים א', 'נערים א׳'], ['נערים ב', 'נערים ב׳'], ['נוער', 'נוער'],
  ];
  const ORDER = GROUPS.map(g => g[1]);
  /* אירועים קבועים בלוח (בלי שעה). kind קובע צבע */
  const SPECIAL = [
    ['2026-12-10', 'כיתות ה׳ · מחזור 2', 'חנוכה, ל׳ בכסלו · בשעות הבוקר'],
    ['2027-01-12', 'כיתות ה׳ · מחזור 3', 'ד׳ בשבט'],
    ['2027-02-09', 'כיתות ה׳ · מחזור 4', 'ב׳ באדר א׳'],
    ['2027-03-30', 'כיתות ה׳ · מחזור 5', 'כ״א באדר ב׳'],
    ['2027-04-13', 'כיתות ה׳ · מחזור 6', 'ו׳ בניסן'],
    ['2027-05-18', 'כיתות ה׳ · מחזור 7', 'י״א באייר'],
  ].map(([date, title, note]) => ({ id: 'l5-' + date, kind: 'league5', date, time: '', title, note }));
  const EVENT_ICON = { league5: '⭐', custom: '📌' };
  async function extras() {
    const s = await DB.settings();
    return [...SPECIAL, ...(s.calEvents || []).map(e => ({ ...e, kind: 'custom' }))];
  }

  /* ---------- עזרים ---------- */
  const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s || ''; return t.value; };
  const clean = s => decode(s).replace(/[״"]/g, '"').replace(/[׳']/g, "'").replace(/\s+/g, ' ').trim();
  const same = (a, b) => clean(a).replace(/['"]/g, '') === clean(b).replace(/['"]/g, '');
  async function get(path, params) {
    const r = await fetch(`${API}/${path}?${new URLSearchParams(params)}`);
    if (!r.ok) throw new Error(`האתר של האיגוד החזיר ${r.status}`);
    return r.json();
  }
  async function getAll(path, params) {
    const out = [];
    for (let page = 1; page < 10; page++) {
      const rows = await get(path, { ...params, per_page: 100, page });
      out.push(...rows);
      if (rows.length < 100) break;
    }
    return out;
  }
  function groupOf(leagueNames) {
    const regular = leagueNames.filter(l => !l.includes('גביע'));
    for (const l of (regular.length ? regular : leagueNames)) {
      const n = clean(l).replace(/-/g, ' ');
      const g = GROUPS.find(([k]) => n.includes(k));
      if (g) return g[1];
    }
    return regular[0] || leagueNames[0] || 'קבוצה';
  }
  function seasonStart() {
    const d = new Date(); const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
    return `${y}-08-01T00:00:00`;
  }
  function travelMinutes(venue) {
    const v = clean(venue);
    const key = Object.keys(TRAVEL).sort((a, b) => b.length - a.length).find(k => v.includes(k));
    return key ? TRAVEL[key] : null;
  }
  const minus = (time, min) => {
    const [h, m] = time.split(':').map(Number); const t = h * 60 + m - min;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  function departure(g) {
    const tm = travelMinutes(g.venue);
    return tm === null || !g.time ? null : minus(g.time, tm + ARRIVE_BEFORE);
  }

  /* ---------- שליפה ---------- */
  async function fetchAll() {
    const since = seasonStart();
    const teams = [];
    for (const club of CLUBS.filter(c => !c.external)) {
      const found = await get('teams', { search: club.search, per_page: 100, _fields: 'id,title,link' });
      for (const t of found) {
        if (!club.names.some(n => same(n, t.title.rendered))) continue;
        teams.push({ id: t.id, club: club.key, link: t.link });
      }
    }
    const events = new Map();
    for (const t of teams) {
      const ev = await getAll('events', { teams: t.id, after: since, _fields: 'id,date,title,teams,leagues,venues' });
      t.leagues = [...new Set(ev.flatMap(e => e.leagues || []))];
      t.events = ev.map(e => e.id);
      ev.forEach(e => events.set(e.id, e));
    }
    const active = teams.filter(t => t.events.length);
    const leagueIds = [...new Set(active.flatMap(t => t.leagues))];
    const venueIds = [...new Set([...events.values()].flatMap(e => e.venues || []))];
    const L = {}, V = {};
    for (let i = 0; i < leagueIds.length; i += 90)
      (await get('leagues', { include: leagueIds.slice(i, i + 90).join(','), per_page: 100, _fields: 'id,name' })).forEach(l => L[l.id] = clean(l.name));
    for (let i = 0; i < venueIds.length; i += 90)
      (await get('venues', { include: venueIds.slice(i, i + 90).join(','), per_page: 100, _fields: 'id,name' })).forEach(v => V[v.id] = clean(v.name));

    const ours = [];
    for (const t of active) {
      const group = groupOf(t.leagues.map(id => L[id] || ''));
      const club = CLUBS.find(c => c.key === t.club);
      if (club.onlyGroups && !club.onlyGroups.includes(group)) continue;
      ours.push({ id: t.id, club: t.club, group, link: t.link });
    }
    const games = [];
    for (const e of events.values()) {
      const sides = ours.filter(t => (e.teams || []).includes(t.id))
        .map(t => ({ club: t.club, group: t.group, teamId: t.id, isHome: e.teams[0] === t.id }));
      if (!sides.length) continue;
      const [home = '', away = ''] = clean(e.title.rendered).split(/\s*[—–]\s*/);
      games.push({ id: e.id, date: e.date.slice(0, 10), time: e.date.slice(11, 16), home, away,
        venue: (e.venues || []).map(v => V[v]).filter(Boolean).join(', '), league: (e.leagues || []).map(l => L[l]).filter(Boolean).join(' / '), sides });
    }
    games.push(...await fetchHapoel());
    if (games.some(g => g.sides[0].club === 'hj')) ours.push({ id: 0, club: 'hj', group: 'בוגרים' });
    games.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const data = { at: Date.now(), teams: ours, games };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
    return data;
  }
  /* הפועל ירושלים: ליגה וגביע מאתר המנהלת (דרך השרת של האתר), יורוקאפ מהאתר של היורוליג */
  async function fetchHapoel() {
    const out = [], he = n => n.replace(/Hapoel (Midtown )?Jerusalem/i, 'הפועל י-ם');
    try {
      const d = await (await fetch('/api/hapoel')).json();
      (d.games || []).forEach((g, i) => out.push({ id: `hj-${g.date}-${i}`, date: g.date, time: g.time, home: g.home, away: g.away,
        venue: g.isHome ? 'פיס ארנה, ירושלים' : '', league: g.stage, result: g.result,
        sides: [{ club: 'hj', group: /גביע/.test(g.stage) ? 'גביע' : 'ווינר', isHome: g.isHome }] }));
    } catch (e) {}
    try {
      const y = seasonStart().slice(0, 4);
      const d = await (await fetch(`https://api-live.euroleague.net/v2/competitions/U/seasons/U${y}/games?teamCode=JER`)).json();
      (d.data || []).forEach(g => {
        const t = new Date(g.utcDate).toLocaleString('sv-SE', { timeZone: 'Asia/Jerusalem' });
        const score = typeof g.local?.score === 'number' && g.played ? `${g.local.score}-${g.road.score}` : '';
        out.push({ id: 'hjE-' + g.id, date: t.slice(0, 10), time: t.slice(11, 16),
          home: he(g.local?.club?.name || ''), away: he(g.road?.club?.name || ''),
          venue: g.venue?.name || '', league: 'יורוקאפ · ' + (g.roundName || ''), result: score,
          sides: [{ club: 'hj', group: 'יורוקאפ', isHome: g.local?.club?.code === 'JER' }] });
      });
    } catch (e) {}
    return out;
  }
  function cached() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; } }
  let inflight = null;
  async function load(force = false) {
    const c = cached();
    if (!force && c && Date.now() - c.at < MAX_AGE) return c;
    inflight = inflight || fetchAll().finally(() => { inflight = null; });
    try { return await inflight; }
    catch (e) { if (c) { c.stale = e.message; return c; } throw e; }
  }
  /* למסך הבית: לא מחכים לאתר יותר מכמה שניות */
  async function forHome() {
    const c = cached();
    const fresh = load().catch(() => c);
    const ev = await extras().catch(() => []);
    if (c && Date.now() - c.at < MAX_AGE) return [...ev, ...c.games];
    const r = await Promise.race([fresh, new Promise(res => setTimeout(() => res(c), 6000))]);
    return [...ev, ...(r?.games || [])];
  }

  /* ---------- תצוגה ---------- */
  const clubLabel = k => CLUBS.find(c => c.key === k)?.label || '';
  const opponentOf = (g, side) => side.isHome ? g.away : g.home;
  function chipClass(g) {
    if (g.kind) return `ev ${g.kind}`;
    const clubs = [...new Set(g.sides.map(s => s.club))];
    return clubs.length > 1 ? 'derby' : `${clubs[0]} ${g.sides[0].isHome ? 'home' : 'away'}`;
  }
  function chipText(g, short = false) {
    if (g.kind) return `${EVENT_ICON[g.kind]} ${g.time ? g.time + ' ' : ''}${g.title}`;
    if (g.sides.length > 1) return `🏀 ${g.time} ${short ? '' : g.sides[0].group + ' · '}דרבי אפרת–קרית ארבע`;
    const s = g.sides[0];
    return `${s.isHome ? '🏠' : '🚌'} ${g.time || '?'} ${s.group}${short ? '' : ' ' + clubLabel(s.club) + ' · ' + (s.isHome ? 'בית' : 'חוץ')}`;
  }
  const chipHTML = g => { const [ico, ...rest] = chipText(g, true).split(' '); return `<span class="ico">${ico}</span> <span class="txt">${U.esc(rest.join(' '))}</span>`; };
  function gameCard(g) {
    const today = U.isoDate();
    return `<div class="game-row ${chipClass(g).split(' ')[0]} ${g.date < today ? 'past' : ''}">
      <div class="date-block"><b>${U.parseISO(g.date).getDate()}</b><span>${U.MONTHS[U.parseISO(g.date).getMonth()]}</span></div>
      <div style="min-width:0">
        <div class="row" style="gap:8px;flex-wrap:wrap">${g.sides.map(s => `<span class="club-tag ${s.club}">${clubLabel(s.club)} · ${U.esc(s.group)}</span><span class="ha ${s.isHome ? 'home' : 'away'}">${s.isHome ? '🏠 בית' : '🚌 חוץ'}</span>`).join('')}</div>
        <h3 style="font-family:var(--font-body);font-weight:700;margin:4px 0 2px">${U.esc(g.home)} – ${U.esc(g.away)}</h3>
        <div class="muted small">יום ${U.DAYS[U.parseISO(g.date).getDay()]} · ${g.time || 'שעה לא סופית'}${g.venue ? ' · ' + U.esc(g.venue) : ''}${g.result ? ' · תוצאה ' + U.esc(g.result) : ''}</div>
      </div>
    </div>`;
  }

  function eventCard(e) {
    const today = U.isoDate(), d = U.parseISO(e.date);
    return `<div class="game-row ev ${e.kind} ${e.date < today ? 'past' : ''}" data-e="${U.esc(e.id)}" style="cursor:pointer">
      <div class="date-block"><b>${d.getDate()}</b><span>${U.MONTHS[d.getMonth()]}</span></div>
      <div style="min-width:0">
        <div class="row" style="gap:8px"><span class="club-tag ev ${e.kind}">${EVENT_ICON[e.kind]} ${e.kind === 'league5' ? 'ליגת כיתות ה׳' : 'אירוע שלי'}</span></div>
        <h3 style="font-family:var(--font-body);font-weight:700;margin:4px 0 2px">${U.esc(e.title)}</h3>
        <div class="muted small">יום ${U.DAYS[d.getDay()]}${e.time ? ' · ' + U.esc(e.time) : ' · עוד אין שעה'}${e.note ? ' · ' + U.esc(e.note) : ''}</div>
      </div>
    </div>`;
  }
  const card = x => x.kind ? eventCard(x) : gameCard(x);
  const byTime = (a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99'));
  function eventModal(e, after) {
    if (e && e.kind === 'league5') return U.modal({ title: e.title, body: eventCard(e) });
    const x = e || { date: U.isoDate(), time: '', title: '', note: '' };
    U.modal({ title: e ? 'עריכת אירוע' : 'הוספה ללוח',
      body: `<div class="stack"><label class="field"><span>מה</span><input class="input" id="ev-t" value="${U.esc(x.title)}" placeholder="למשל: אסיפת הורים, טורניר, אימון משותף"></label>
        <div class="grid-2"><label class="field"><span>תאריך</span><input class="input" type="date" id="ev-d" value="${x.date}"></label>
        <label class="field"><span>שעה (לא חובה)</span><input class="input" type="time" id="ev-h" value="${U.esc(x.time || '')}"></label></div>
        <label class="field"><span>הערה</span><input class="input" id="ev-n" value="${U.esc(x.note || '')}"></label></div>`,
      foot: `<button class="btn primary" data-ok>שמירה</button>${e ? '<button class="btn danger" data-del>מחיקה</button>' : ''}<button class="btn" data-close>ביטול</button>`,
      onOpen: (m, close) => {
        const save = async list => { await DB.saveSettings({ calEvents: list }); close(); after && after(); };
        m.querySelector('[data-ok]').onclick = async () => {
          const title = U.$('#ev-t', m).value.trim(), date = U.$('#ev-d', m).value;
          if (!title || !date) return U.toast('צריך שם ותאריך', true);
          const list = ((await DB.settings()).calEvents || []).filter(y => y.id !== x.id);
          list.push({ id: x.id || DB.uid(), title, date, time: U.$('#ev-h', m).value, note: U.$('#ev-n', m).value.trim() });
          await save(list); U.toast('נשמר בלוח');
        };
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = async () => { await save(((await DB.settings()).calEvents || []).filter(y => y.id !== x.id)); U.toast('נמחק'); };
      } });
  }

  let month = null, tab = 'calendar', clubFilter = '';
  async function render(view) {
    view.innerHTML = `<div class="page-head"><div><h1>משחקים והסעות</h1><p class="muted">מעודכן מאתר האיגוד</p></div></div><div class="empty"><p>טוען משחקים מאתר האיגוד…</p></div>`;
    let data;
    try { data = await load(); }
    catch (e) { view.innerHTML = `<div class="empty"><h3>לא הצלחתי לטעון את המשחקים</h3><p class="small">${U.esc(e.message)}</p><button class="btn" id="retry">לנסות שוב</button></div>`; U.$('#retry', view).onclick = () => render(view); return; }
    if (!month) month = U.isoDate().slice(0, 7);
    const games = data.games.filter(g => !clubFilter || g.sides.some(s => s.club === clubFilter));
    const events = await extras();
    const updated = new Date(data.at);
    view.innerHTML = `
      <div class="page-head">
        <div><h1>משחקים והסעות</h1>
          <p class="muted small">עודכן ${updated.getDate()}.${updated.getMonth() + 1} ${String(updated.getHours()).padStart(2, '0')}:${String(updated.getMinutes()).padStart(2, '0')}${data.stale ? ' · <span class="due-late">לא הצלחתי לרענן</span>' : ''} · ${data.teams.map(t => `${clubLabel(t.club)} ${U.esc(t.group)}`).join(', ') || 'לא נמצאו קבוצות'}</p></div>
        <div class="row"><button class="btn primary" id="add-ev">${U.icon('plus', 18)} הוספה ללוח</button><button class="btn" id="refresh">${U.icon('redo', 18)} רענון</button><button class="btn" id="phones">${U.icon('whatsapp', 18)} מספרים</button></div>
      </div>
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div class="chips" id="tabs">${[['calendar', 'לוח שנה'], ['list', 'רשימה'], ['week', 'הודעות השבוע']].map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
        <div class="chips" id="clubs"><button class="chip ${!clubFilter ? 'on' : ''}" data-c="">הכל</button>${CLUBS.map(c => `<button class="chip ${clubFilter === c.key ? 'on' : ''}" data-c="${c.key}"><i class="dot ${c.key}"></i>${c.label}</button>`).join('')}</div>
      </div>
      <div id="body"></div>`;
    const body = U.$('#body', view);
    if (tab === 'calendar') paintCalendar(body, games, view, events);
    else if (tab === 'list') paintList(body, games, events, view);
    else await paintWeek(body, data.games);
    U.$('#tabs', view).onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(view); } };
    U.$('#clubs', view).onclick = e => { const b = e.target.closest('[data-c]'); if (b) { clubFilter = b.dataset.c; render(view); } };
    U.$('#refresh', view).onclick = async () => { U.toast('מרענן…'); try { await load(true); render(view); } catch (e) { U.toast(e.message, true); } };
    U.$('#phones', view).onclick = () => phonesModal(() => render(view));
    U.$('#add-ev', view).onclick = () => eventModal(null, () => render(view));
  }

  function paintCalendar(body, games, view, events = []) {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1), start = new Date(first); start.setDate(1 - first.getDay());
    const today = U.isoDate();
    const cells = [...Array(42)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return U.isoDate(d); });
    const weeks = []; for (let i = 0; i < 42; i += 7) if (i < 35 || cells[i].slice(0, 7) === month) weeks.push(cells.slice(i, i + 7));
    const inMonth = [...games, ...events].filter(g => g.date.startsWith(month)).sort(byTime);
    body.innerHTML = `
      <div class="panel" style="padding:12px">
        <div class="row" style="justify-content:space-between;margin-bottom:10px">
          <button class="btn sm icon" id="prev" aria-label="החודש הקודם">${U.icon('back', 16)}</button>
          <h2 style="margin:0">${U.MONTHS[m - 1]} ${y}</h2>
          <button class="btn sm icon" id="next" aria-label="החודש הבא" style="transform:scaleX(-1)">${U.icon('back', 16)}</button>
        </div>
        <div class="cal">
          ${U.DAYS_S.map(d => `<div class="cal-h">${d}</div>`).join('')}
          ${weeks.flat().map(d => {
            const dg = inMonth.filter(g => g.date === d);
            return `<div class="cal-d ${d.slice(0, 7) !== month ? 'out' : ''} ${d === today ? 'today' : ''}">
              <span class="cal-n">${U.parseISO(d).getDate()}</span>
              ${dg.map(g => g.kind ? `<button class="cal-g ${chipClass(g)}" data-e="${U.esc(g.id)}" title="${U.esc(g.title)}">${chipHTML(g)}</button>` : `<button class="cal-g ${chipClass(g)}" data-g="${g.id}" title="${U.esc(g.home + ' – ' + g.away)}">${chipHTML(g)}</button>`).join('')}
            </div>`;
          }).join('')}
        </div>
        <div class="cal-legend small muted">${CLUBS.map(c => `<span><i class="dot ${c.key}"></i>${c.label}</span>`).join('')}<span><i class="dot derby"></i>דרבי ביניהן</span><span><i class="dot league5"></i>ליגת כיתות ה׳</span><span><i class="dot custom"></i>אירוע שלי</span><span>🏠 בית = צבע מלא · 🚌 חוץ = מסגרת</span></div>
      </div>
      <div class="cal-agenda">${inMonth.length ? inMonth.map(card).join('') : '<div class="empty"><p>אין משחקים החודש</p></div>'}</div>`;
    const shift = n => { const d = new Date(y, m - 1 + n, 1); month = U.isoDate(d).slice(0, 7); render(view); };
    U.$('#prev', body).onclick = () => shift(-1);
    U.$('#next', body).onclick = () => shift(1);
    U.$$('[data-g]', body).forEach(b => b.onclick = () => {
      const g = games.find(x => String(x.id) === b.dataset.g);
      U.modal({ title: 'משחק', body: gameCard(g) + (g.league ? `<p class="small muted" style="margin-top:10px">ליגה: ${U.esc(g.league)}</p>` : '') });
    });
    U.$$('[data-e]', body).forEach(b => b.onclick = () => eventModal(events.find(x => x.id === b.dataset.e), () => render(view)));
  }

  function paintList(body, games, events = [], view) {
    const today = U.isoDate(), all = [...games, ...events].sort(byTime);
    const up = all.filter(g => g.date >= today), past = all.filter(g => g.date < today).reverse();
    body.innerHTML = `<div class="list">${up.map(card).join('') || '<div class="empty"><p>אין משחקים קרובים</p></div>'}</div>
      ${past.length ? `<details style="margin-top:16px"><summary class="small" style="cursor:pointer;font-weight:600">היו כבר (${past.length})</summary><div class="list" style="margin-top:8px">${past.map(card).join('')}</div></details>` : ''}`;
    U.$$('[data-e]', body).forEach(b => b.onclick = () => eventModal(events.find(x => x.id === b.dataset.e), () => render(view)));
  }

  /* ---------- הודעות השבוע (קרית ארבע) ---------- */
  let weekOffset = null;
  function weekRange(offset) {
    const d = U.parseISO(U.isoDate());
    const startOff = offset === null ? (7 - d.getDay()) % 7 : offset;   // ברירת מחדל: ראשון הקרוב (או היום אם ראשון)
    d.setDate(d.getDate() + startOff - (offset === null ? 0 : d.getDay()));
    const from = U.isoDate(d); return [from, U.addDays(from, 6)];
  }
  async function paintWeek(body, allGames) {
    const s = await DB.settings();
    const [from, to] = weekRange(weekOffset);
    const club = CLUBS.find(c => c.messages);
    const wk = allGames.filter(g => g.date >= from && g.date <= to && g.sides.some(x => x.club === club.key))
      .map(g => { const side = g.sides.find(x => x.club === club.key); return { ...g, side, dep: side.isHome ? null : departure(g) }; });
    const away = wk.filter(g => !g.side.isHome), home = wk.filter(g => g.side.isHome);
    const label = `${U.fmtShort(from)}–${U.fmtShort(to)}`;
    const msgs = {
      coaches: coachesMsg(wk, label), transport: transportMsg(away, home, label), secretary: secretaryMsg(home, label),
    };
    body.innerHTML = `
      <div class="chips" id="wk" style="margin-bottom:12px">
        <button class="chip ${weekOffset === 0 ? 'on' : ''}" data-w="0">השבוע הנוכחי</button>
        <button class="chip ${weekOffset === null ? 'on' : ''}" data-w="">השבוע הבא</button>
      </div>
      <div class="panel"><div class="panel-head"><h2>${club.label} · ${label}</h2><span class="muted small">בית: ${home.length} · חוץ: ${away.length}</span></div>
        ${wk.length ? `<div class="list">${wk.map(g => gameCard(g).replace('</h3>', `</h3>${g.dep ? `<div class="small"><b>יציאת הסעה: ${g.dep}</b></div>` : !g.side.isHome ? '<div class="small due-late">אין זמן נסיעה לאולם הזה — בדוק שעת יציאה</div>' : ''}`)).join('')}</div>` : '<p class="muted">אין משחקים בשבוע הזה.</p>'}
      </div>
      <div class="grid-2" style="align-items:start;margin-top:16px">
        ${[['transport', 'לנהג', s.transportPhone], ['secretary', 'למזכירות', s.secretaryPhone], ['coaches', 'לקבוצת המאמנים', null]].map(([k, t, phone]) => `
          <div class="panel"><div class="panel-head"><h2>${t}</h2>
            <div class="row">${k === 'coaches' ? '' : `<button class="btn sm primary" data-send="${k}">${U.icon('whatsapp', 16)} שליחה</button>`}<button class="btn sm" data-copy="${k}">${U.icon('copy', 16)} העתקה</button></div></div>
            <pre class="msg">${U.esc(msgs[k])}</pre>
            ${k !== 'coaches' && !phone ? '<p class="small muted">עוד אין מספר. לחץ "מספרים" למעלה.</p>' : ''}</div>`).join('')}
      </div>`;
    U.$('#wk', body).onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; weekOffset = b.dataset.w === '' ? null : 0; paintWeek(body, allGames); };
    U.$$('[data-copy]', body).forEach(b => b.onclick = async () => { await navigator.clipboard.writeText(msgs[b.dataset.copy]); U.toast('הועתק — הדבק בוואטסאפ'); });
    U.$$('[data-send]', body).forEach(b => b.onclick = () => {
      const phone = b.dataset.send === 'transport' ? s.transportPhone : s.secretaryPhone;
      if (!phone) return phonesModal(() => paintWeek(body, allGames));
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msgs[b.dataset.send])}`, '_blank');
    });
  }
  const byDay = list => { const m = new Map(); list.forEach(g => { if (!m.has(g.date)) m.set(g.date, []); m.get(g.date).push(g); }); return m; };
  const dayTitle = d => `יום ${U.DAYS[U.parseISO(d).getDay()]} ${U.fmtShort(d)}`;
  const opp = g => opponentOf(g, g.side).replace(/אליצור הר חברון קריה|אליצור הר חברון/g, '').replace(/^[\s–-]+|[\s–-]+$/g, '') || 'יריב';
  function coachesMsg(wk, label) {
    if (!wk.length) return 'שלום לכולם\nאין משחקים בשבוע הקרוב.\nשבוע טוב!';
    const h = new Date().getHours();
    const lines = [h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : 'ערב טוב', `משחקים ${label}:`];
    for (const [d, gs] of byDay(wk)) {
      lines.push('', dayTitle(d));
      gs.forEach((g, i) => {
        if (i) lines.push('');
        lines.push(`${g.side.group} - ${COACHES[g.side.group] || ''}`, `${g.side.isHome ? '🏠' : '🚌'} משחק ${g.side.isHome ? 'בית' : 'חוץ'} ב${g.time} נגד ${opp(g)}`);
        if (g.dep) lines.push(`הסעה בשעה ${g.dep}`);
      });
    }
    return lines.join('\n');
  }
  function transportMsg(away, home, label) {
    if (!away.length) return home.length
      ? `שלום\nהשבוע יש רק משחקי בית (${[...new Set(home.map(g => U.fmtShort(g.date)))].join(', ')}) בקרית ארבע — לא נדרשת הסעה.\nתודה רבה!`
      : 'שלום\nאין משחקי חוץ בשבוע הקרוב.\nתודה רבה!';
    const lines = [`שלום\nהסעות ${label}:`];
    for (const [d, gs] of byDay(away)) {
      lines.push('', dayTitle(d));
      gs.forEach(g => {
        lines.push(`${g.side.group} - ${COACHES[g.side.group] || ''}`, `משחק ב${g.time}`);
        if (g.venue) lines.push(`אולם: ${g.venue}`);
        lines.push(g.dep ? `יציאה: ${g.dep}` : 'שעת יציאה: תעודכן בנפרד');
      });
    }
    lines.push('', 'תודה רבה!');
    return lines.join('\n');
  }
  function secretaryMsg(home, label) {
    if (!home.length) return 'שלום\nאין משחקי בית בשבוע הקרוב.\nתודה רבה!';
    const lines = [`שלום\nמשחקי בית ${label}:`];
    for (const [d, gs] of byDay(home)) { lines.push('', dayTitle(d)); gs.forEach(g => lines.push(`${g.side.group} ב${g.time}`)); }
    lines.push('', 'תודה רבה!');
    return lines.join('\n');
  }
  async function phonesModal(after) {
    const s = await DB.settings();
    const show = p => p ? '0' + String(p).replace(/^972/, '') : '';
    const norm = v => { const d = v.replace(/\D/g, ''); return !d ? '' : d.startsWith('972') ? d : '972' + d.replace(/^0/, ''); };
    U.modal({ title: 'מספרי וואטסאפ',
      body: `<div class="stack"><label class="field"><span>נהג ההסעות</span><input class="input" id="ph-t" inputmode="tel" value="${show(s.transportPhone)}" placeholder="050-0000000"></label>
        <label class="field"><span>מזכירות</span><input class="input" id="ph-s" inputmode="tel" value="${show(s.secretaryPhone)}" placeholder="050-0000000"></label>
        <p class="small muted">המספרים נשמרים בהגדרות שלך ומגובים בענן — הם לא נכנסים לקוד של האתר.</p></div>`,
      foot: `<button class="btn primary" data-ok>שמירה</button><button class="btn" data-close>ביטול</button>`,
      onOpen: (m, close) => m.querySelector('[data-ok]').onclick = async () => {
        await DB.saveSettings({ transportPhone: norm(U.$('#ph-t', m).value), secretaryPhone: norm(U.$('#ph-s', m).value) });
        close(); U.toast('נשמר'); after && after();
      } });
  }

  return { render, load, forHome, chipClass, chipText };
})();
