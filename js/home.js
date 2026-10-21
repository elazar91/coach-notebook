/* מסך הבית: השבוע של המאמן */
const Home = (() => {
  async function render(view) {
    const [sessions, tasks, drills, docs, settings] = await Promise.all([DB.all('sessions'), DB.all('tasks'), DB.all('drills'), DB.all('docs'), DB.settings()]);
    const today = U.isoDate();
    const d0 = U.parseISO(today); d0.setDate(d0.getDate() - d0.getDay());
    const week = [...Array(7)].map((_, i) => { const d = new Date(d0); d.setDate(d0.getDate() + i); return U.isoDate(d); });
    const open = tasks.filter(t => t.status !== 'done');
    const urgent = open.filter(t => t.due && t.due <= today).sort((a, b) => a.due.localeCompare(b.due));
    const past = sessions.filter(s => s.date <= today).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const upcoming = sessions.filter(s => s.date > today || (s.date === today && !s.worked)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const last = past.find(s => s.worked || s.improve || s.advice) || past[0];
    const next = upcoming[0];
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב';

    view.innerHTML = `
      <div class="page-head"><div><h1>${hello}${settings.coachName ? ', ' + U.esc(settings.coachName) : ''}</h1><p>${U.fmtDate(today)}</p></div>
        <div class="row"><a class="btn primary" href="#/board/new">${U.icon('board', 18)} סרטוט תרגיל</a><button class="btn" id="h-session">${U.icon('plus', 18)} אימון</button></div></div>
      <section class="week" aria-label="השבוע">
        ${week.map((d, i) => {
          const ds = sessions.filter(s => s.date === d).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
          const dt = tasks.filter(t => t.due === d && (t.status !== 'done' || d >= today));
          return `<div class="day ${d === today ? 'today' : ''}">
            <div class="day-name"><span>${U.DAYS[i]}</span><span class="day-num">${U.parseISO(d).getDate()}</span></div>
            ${ds.map(s => `<a class="day-item session" href="#/session/${s.id}">${s.time ? U.esc(s.time) + ' ' : ''}${U.esc(s.team || 'אימון')}</a>`).join('')}
            ${dt.slice(0, 4).map(t => `<button class="day-item ${t.status === 'done' ? 'done' : ''}" data-task="${t.id}">${U.esc(t.title)}</button>`).join('')}
            ${dt.length > 4 ? `<a class="small" href="#/tasks" style="opacity:.8">ועוד ${dt.length - 4}</a>` : ''}
          </div>`;
        }).join('')}
      </section>
      <div class="home-grid">
        <div>
          ${next ? `<div class="panel"><div class="panel-head"><h2>האימון הבא</h2><a class="btn sm" href="#/session/${next.id}">פתיחה</a></div>
            <p><b>${U.esc(next.team || 'אימון')}</b> · ${U.fmtDate(next.date)}${next.time ? ' · ' + U.esc(next.time) : ''}</p>
            ${next.goal ? `<p>מטרה: ${U.esc(next.goal)}</p>` : '<p class="muted">עוד אין מטרה. מומלץ לכתוב אותה לפני שמגיעים לאולם.</p>'}
            ${next.plan?.length ? `<p class="small muted">${next.plan.map(p => `${U.esc(p.title)} (${U.esc(p.min || '?')}׳)`).join(' · ')}</p>` : '<p class="small muted">המבנה עוד ריק.</p>'}</div>` : ''}
          ${last ? `<div class="panel"><div class="panel-head"><h2>מהאימון האחרון</h2><a class="btn sm" href="#/session/${last.id}">פתיחה</a></div>
            <p><b>${U.esc(last.team || 'אימון')}</b> · ${U.fmtDate(last.date)}${Sessions.orgScore(last) !== null ? ` · סדר וארגון ${Sessions.orgScore(last)}%` : ''}</p>
            ${last.improve ? `<p><span class="muted">לשפר:</span> ${U.esc(last.improve)}</p>` : ''}
            ${last.advice ? `<details><summary class="small" style="cursor:pointer;font-weight:600">ההמלצה לאימון הבא</summary><div class="advice" style="margin-top:8px">${U.md(last.advice)}</div></details>` : ''}
            </div>` : ''}
          ${!next && !last ? `<div class="empty"><h3>מתחילים מכאן</h3><p>סרטט תרגיל ראשון, או רשום את האימון האחרון שהעברת — היומן יתחיל לבנות לך תמונה של העונה.</p></div>` : ''}
        </div>
        <div>
          <div class="panel" id="today-tasks">
            <div class="panel-head"><h2>לטפל היום</h2><a class="btn sm" href="#/tasks">כל המשימות</a></div>
            ${urgent.length ? urgent.slice(0, 7).map(t => `<label class="check-item"><input type="checkbox" data-done="${t.id}"><span>${U.esc(t.title)}${t.due < today ? ` <span class="due-late small">(${U.fmtShort(t.due)})</span>` : ''}</span></label>`).join('')
              : '<p class="muted">אין משימות להיום. <a href="#/tasks">הוספת משימה</a></p>'}
          </div>
          <div class="panel">
            <div class="stat-row">
              <a class="stat" href="#/drills" style="text-decoration:none"><b>${drills.length}</b><span>תרגילים</span></a>
              <a class="stat" href="#/sessions" style="text-decoration:none"><b>${sessions.length}</b><span>אימונים ביומן</span></a>
              <a class="stat" href="#/tasks" style="text-decoration:none"><b>${open.length}</b><span>משימות פתוחות</span></a>
              <a class="stat" href="#/docs" style="text-decoration:none"><b>${docs.length}</b><span>מסמכים</span></a>
            </div>
          </div>
        </div>
      </div>`;

    U.$('#h-session', view).onclick = async () => {
      const s = Sessions.newSession({ team: past[0]?.team || settings.teams?.[0] || '' });
      await DB.put('sessions', s); location.hash = '#/session/' + s.id;
    };
    U.$('#today-tasks', view).addEventListener('change', async e => {
      const id = e.target.dataset?.done; if (!id) return;
      await Tasks.toggle(tasks.find(t => t.id === id)); render(view);
    });
    U.$$('[data-task]', view).forEach(b => b.onclick = () => Tasks.editModal(tasks.find(t => t.id === b.dataset.task), () => render(view)));
  }
  return { render };
})();
