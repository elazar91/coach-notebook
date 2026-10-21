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
  DB.open().then(route).catch(e => {
    U.$('#view').innerHTML = `<div class="empty"><h3>הדפדפן חוסם שמירת נתונים</h3><p>ייתכן שזה חלון גלישה בסתר. פתח את האתר בחלון רגיל.</p><p class="small">${U.esc(e?.message || '')}</p></div>`;
  });
})();
