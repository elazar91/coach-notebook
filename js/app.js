/* ניתוב וניווט */
(() => {
  const NAV = [
    ['home', 'בית', 'home'],
    ['drills', 'תרגילים', 'drills'],
    ['sessions', 'אימונים', 'sessions'],
    ['docs', 'מסמכים', 'docs'],
    ['tasks', 'משימות', 'tasks'],
    ['settings', 'הגדרות', 'settings'],
  ];
  const navHTML = NAV.map(([r, label, ic]) => `<a href="#/${r}" data-r="${r}">${U.icon(ic, 20)}<span>${label}</span></a>`).join('');
  U.$('#nav').innerHTML = navHTML;
  U.$('#tabbar').innerHTML = NAV.filter(n => n[0] !== 'settings').map(([r, label, ic]) => `<a href="#/${r}" data-r="${r}">${U.icon(ic, 22)}<span>${label}</span></a>`).join('');

  const SECTION = { board: 'drills', session: 'sessions' };
  async function route() {
    const view = U.$('#view');
    U.$$('#modal-root .modal').forEach(m => m.close());
    const h = location.hash || '#/home';
    if (h.startsWith('#view=')) {
      setActive('');
      document.title = 'תרגיל · מחברת המאמן';
      return Board.viewer(view, h.slice(6));
    }
    const [, page = 'home', id] = h.split('/');
    setActive(SECTION[page] || page);
    view.innerHTML = '';
    window.scrollTo(0, 0);
    const titles = { home: 'בית', drills: 'תרגילים', board: 'סרטוט תרגיל', sessions: 'אימונים', session: 'אימון', docs: 'מסמכים', tasks: 'משימות', settings: 'הגדרות' };
    document.title = (titles[page] ? titles[page] + ' · ' : '') + 'מחברת המאמן';
    try {
      switch (page) {
        case 'home': return await Home.render(view);
        case 'drills': return await Drills.render(view);
        case 'board': return await Board.editor(view, id);
        case 'sessions': return await Sessions.list(view);
        case 'session': return await Sessions.edit(view, id);
        case 'docs': return await Docs.render(view);
        case 'tasks': return await Tasks.render(view);
        case 'settings': return await Settings.render(view);
        default: location.hash = '#/home';
      }
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="empty"><h3>משהו השתבש בטעינת המסך</h3><p class="small">${U.esc(e.message)}</p><a class="btn" href="#/home">למסך הבית</a></div>`;
    }
  }
  function setActive(r) {
    U.$$('#nav a, #tabbar a').forEach(a => a.classList.toggle('active', a.dataset.r === r));
  }
  window.addEventListener('hashchange', route);

  /* מצב הגיבוי בענן בתפריט הצד */
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'עכשיו' : m < 60 ? `לפני ${m} דק׳` : `לפני ${Math.round(m / 60)} שע׳`; };
  function paintCloud(i) {
    const el = U.$('#cloud-status'); if (!el) return;
    const map = {
      ok: ['ok', `מגובה בענן · ${ago(i.lastSync)}`],
      syncing: ['busy', 'מסנכרן…'],
      error: ['err', 'הסנכרון נתקע — לפרטים'],
      off: ['off', 'לא מגובה בענן — להתחברות'],
      unavailable: ['off', 'אין חיבור לענן'],
    };
    const [cls, text] = map[i.status] || map.off;
    el.className = 'side-foot cloud ' + cls;
    el.innerHTML = `<i></i>${U.esc(text)}${i.pending && i.status !== 'syncing' ? ` <span>(${i.pending} ממתינים)</span>` : ''}`;
  }
  Sync.onChange(paintCloud);
  setInterval(() => paintCloud(Sync.info()), 30000);
  /* נתונים חדשים מהענן: מרעננים מסכי רשימה (לא מסכי עריכה) */
  window.addEventListener('coach-synced', () => {
    const page = (location.hash || '#/home').split('/')[1];
    if (['home', 'drills', 'sessions', 'docs', 'tasks'].includes(page) && !U.$('#modal-root .modal')) route();
  });

  DB.open().then(() => Sync.init()).then(route).catch(e => {
    U.$('#view').innerHTML = `<div class="empty"><h3>הדפדפן חוסם שמירת נתונים</h3><p>ייתכן שזה חלון גלישה בסתר. פתח את האתר בחלון רגיל.</p><p class="small">${U.esc(e?.message || '')}</p></div>`;
  });
})();
