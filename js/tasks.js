/* יומן משימות */
const Tasks = (() => {
  const AREAS = ['אימונים', 'משחקים והסעות', 'שחקנים והורים', 'צוות מאמנים', 'ציוד ואולמות', 'כספים', 'השתלמות', 'אחר'];
  const PRIO = { high: 'דחוף', mid: 'רגיל', low: 'נמוך' };
  const REPEAT = { none: 'חד פעמי', daily: 'כל יום', weekly: 'כל שבוע', monthly: 'כל חודש' };
  let filter = { area: '', q: '', show: 'open' };

  function nextDue(t) {
    const base = t.due || U.isoDate();
    if (t.repeat === 'daily') return U.addDays(base, 1);
    if (t.repeat === 'weekly') return U.addDays(base, 7);
    if (t.repeat === 'monthly') { const d = U.parseISO(base); d.setMonth(d.getMonth() + 1); return U.isoDate(d); }
    return null;
  }
  /* סימון כבוצע; משימה חוזרת יוצרת את המופע הבא */
  async function toggle(t) {
    if (t.status === 'done') { t.status = 'open'; t.doneAt = null; await DB.put('tasks', t); return; }
    t.status = 'done'; t.doneAt = Date.now(); await DB.put('tasks', t);
    const nd = t.repeat && t.repeat !== 'none' ? nextDue(t) : null;
    if (nd) { await DB.put('tasks', { ...t, id: DB.uid(), status: 'open', doneAt: null, due: nd, createdAt: null }); U.toast('בוצע. המשימה הבאה נקבעה ל-' + U.fmtShort(nd)); }
  }

  function taskHTML(t, today) {
    const late = t.status !== 'done' && t.due && t.due < today;
    return `<div class="task ${t.status === 'done' ? 'done' : ''}" data-id="${t.id}">
      <input type="checkbox" ${t.status === 'done' ? 'checked' : ''} aria-label="בוצע">
      <div style="min-width:0"><div class="t-title" data-edit>${U.esc(t.title)}</div>
        <div class="t-meta"><span class="prio ${t.prio || 'mid'}" title="${PRIO[t.prio || 'mid']}"></span>${t.area ? `<span>${U.esc(t.area)}</span>` : ''}
          ${t.due ? `<span class="${late ? 'due-late' : ''}">${U.icon('calendar', 13)} ${U.fmtShort(t.due)}</span>` : ''}
          ${t.repeat && t.repeat !== 'none' ? `<span>${U.icon('redo', 13)} ${REPEAT[t.repeat]}</span>` : ''}
          ${t.notes ? `<span>${U.icon('note', 13)}</span>` : ''}</div></div>
      <button class="btn sm icon ghost" data-edit aria-label="עריכה">${U.icon('edit', 16)}</button>
    </div>`;
  }

  function editModal(t, onDone) {
    const isNew = !t.id;
    U.modal({
      title: isNew ? 'משימה חדשה' : 'עריכת משימה',
      body: `<div class="stack">
        <label class="field"><span>משימה</span><input class="input" id="tt" value="${U.esc(t.title)}"></label>
        <div class="grid-2">
          <label class="field"><span>תחום</span><select class="input" id="ta">${AREAS.map(a => `<option ${t.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
          <label class="field"><span>עדיפות</span><select class="input" id="tp">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${(t.prio || 'mid') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="field"><span>תאריך יעד</span><input class="input" type="date" id="td" value="${t.due || ''}"></label>
          <label class="field"><span>חזרה</span><select class="input" id="tr">${Object.entries(REPEAT).map(([k, v]) => `<option value="${k}" ${(t.repeat || 'none') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span>הערות</span><textarea class="input" id="tn" rows="4">${U.esc(t.notes)}</textarea></label></div>`,
      foot: `<button class="btn primary" data-save>שמירה</button>${!isNew ? `<button class="btn ghost danger" data-del>${U.icon('trash', 16)} מחיקה</button>` : ''}`,
      onOpen: (m, close) => {
        m.querySelector('[data-save]').onclick = async () => {
          const title = m.querySelector('#tt').value.trim(); if (!title) { U.toast('כתוב מה המשימה', true); return; }
          Object.assign(t, { title, area: m.querySelector('#ta').value, prio: m.querySelector('#tp').value, due: m.querySelector('#td').value, repeat: m.querySelector('#tr').value, notes: m.querySelector('#tn').value });
          t.status ||= 'open';
          await DB.put('tasks', t); close(); onDone();
        };
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = async () => { if (!await U.confirm('למחוק את המשימה?')) return; await DB.del('tasks', t.id); close(); onDone(); };
      }
    });
  }

  async function render(view) {
    const all = await DB.all('tasks');
    const today = U.isoDate(), weekEnd = U.addDays(today, 7);
    const open = all.filter(t => t.status !== 'done');
    view.innerHTML = `
      <div class="page-head">
        <div><h1>משימות</h1><p>${open.length ? `${open.length} פתוחות${open.filter(t => t.due && t.due < today).length ? ` · ${open.filter(t => t.due && t.due < today).length} באיחור` : ''}` : 'כל מה שצריך לזכור — אימונים, משחקים, הורים, ציוד'}</p></div>
      </div>
      <form class="quick-add panel" id="qa" style="padding:10px">
        <input class="input" id="qt" placeholder="משימה חדשה… למשל: להזמין אולם לטורניר חנוכה" autocomplete="off">
        <select class="input" id="qarea">${AREAS.map(a => `<option ${filter.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
        <input class="input" type="date" id="qd" aria-label="תאריך יעד">
        <select class="input" id="qp">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${k === 'mid' ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <button class="btn primary" type="submit">${U.icon('plus', 18)} הוספה</button>
      </form>
      <div class="row" style="margin-top:16px;justify-content:space-between">
        <div class="chips" id="areas"><button class="chip ${!filter.area ? 'on' : ''}" data-a="">כל התחומים</button>${AREAS.map(a => `<button class="chip ${filter.area === a ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
        <div class="chips" id="show"><button class="chip ${filter.show === 'open' ? 'on' : ''}" data-s="open">פתוחות</button><button class="chip ${filter.show === 'done' ? 'on' : ''}" data-s="done">בוצעו</button></div>
      </div>
      <div id="groups"></div>`;

    const paint = () => {
      const pool = all.filter(t => !filter.area || t.area === filter.area);
      const box = U.$('#groups', view);
      if (filter.show === 'done') {
        const done = pool.filter(t => t.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 60);
        box.innerHTML = done.length ? `<div class="task-group"><h3>בוצעו לאחרונה <span class="count">${done.length}</span></h3>${done.map(t => taskHTML(t, today)).join('')}</div>` : `<div class="empty" style="margin-top:16px"><h3>עוד לא סימנת משימות כבוצעו</h3></div>`;
        return;
      }
      const o = pool.filter(t => t.status !== 'done');
      const rank = { high: 0, mid: 1, low: 2 };
      const sort = L => L.sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || rank[a.prio || 'mid'] - rank[b.prio || 'mid']);
      const groups = [
        ['late', 'באיחור', o.filter(t => t.due && t.due < today)],
        ['', 'היום', o.filter(t => t.due === today)],
        ['', 'השבוע', o.filter(t => t.due > today && t.due <= weekEnd)],
        ['', 'בהמשך', o.filter(t => t.due > weekEnd)],
        ['', 'בלי תאריך', o.filter(t => !t.due)],
      ].filter(g => g[2].length);
      box.innerHTML = groups.length ? groups.map(([cls, name, L]) => `<div class="task-group ${cls}"><h3>${name} <span class="count">${L.length}</span></h3>${sort(L).map(t => taskHTML(t, today)).join('')}</div>`).join('')
        : `<div class="empty" style="margin-top:16px"><h3>${all.length ? 'אין משימות פתוחות כאן' : 'הרשימה ריקה'}</h3><p>כתוב משימה בשורה למעלה ולחץ Enter. משימות שחוזרות כל שבוע (למשל "לשלוח תכנית אימונים להורים") אפשר להגדיר פעם אחת.</p></div>`;
    };
    paint();

    U.$('#qa', view).onsubmit = async e => {
      e.preventDefault();
      const title = U.$('#qt', view).value.trim(); if (!title) return;
      const t = await DB.put('tasks', { title, area: U.$('#qarea', view).value, due: U.$('#qd', view).value, prio: U.$('#qp', view).value, status: 'open', repeat: 'none', notes: '' });
      await render(view); U.$('#qt', view).focus();
    };
    U.$('#areas', view).onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; filter.area = b.dataset.a; U.$$('#areas .chip', view).forEach(c => c.classList.toggle('on', c === b)); if (filter.area) U.$('#qarea', view).value = filter.area; paint(); };
    U.$('#show', view).onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; filter.show = b.dataset.s; U.$$('#show .chip', view).forEach(c => c.classList.toggle('on', c === b)); paint(); };
    U.$('#groups', view).onclick = async e => {
      const row = e.target.closest('[data-id]'); if (!row) return;
      const t = all.find(x => x.id === row.dataset.id);
      if (e.target.matches('input[type=checkbox]')) { await toggle(t); render(view); return; }
      if (e.target.closest('[data-edit]')) editModal(t, () => render(view));
    };
  }

  return { render, toggle, editModal, AREAS };
})();
