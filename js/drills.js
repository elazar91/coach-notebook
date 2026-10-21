/* ספריית התרגילים */
const Drills = (() => {
  let filter = { q: '', cat: '' };
  async function render(view) {
    const drills = (await DB.all('drills')).sort((a, b) => b.updatedAt - a.updatedAt);
    view.innerHTML = `
      <div class="page-head">
        <div><h1>ספריית התרגילים</h1><p>${drills.length ? drills.length + ' תרגילים שמורים' : 'כל תרגיל שתסרטט יישמר כאן'}</p></div>
        <a class="btn primary" href="#/board/new">${U.icon('plus', 18)} תרגיל חדש</a>
      </div>
      ${drills.length ? `<div class="stack" style="margin-bottom:18px">
        <div class="search"><input class="input" id="q" placeholder="חיפוש לפי שם, תגית או הסבר" value="${U.esc(filter.q)}">${U.icon('search', 18)}</div>
        <div class="chips" id="cats"><button class="chip ${!filter.cat ? 'on' : ''}" data-c="">הכל</button>${Board.CATS.map(c => `<button class="chip ${filter.cat === c ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
      </div>` : ''}
      <div id="grid"></div>`;
    const grid = U.$('#grid', view);
    function paint() {
      if (!drills.length) {
        grid.innerHTML = `<div class="empty"><h3>עוד אין תרגילים</h3><p>מסרטטים על המגרש, מוסיפים שלבים, ומקבלים סרטון קצר לשליחה לשחקנים.</p><a class="btn primary" href="#/board/new">סרטוט תרגיל ראשון</a></div>`;
        return;
      }
      const q = U.norm(filter.q);
      const list = drills.filter(d => (!filter.cat || d.cat === filter.cat) &&
        (!q || U.norm([d.name, d.tags, d.desc, d.cat, d.age].join(' ')).includes(q)));
      grid.innerHTML = list.length ? `<div class="cards">${list.map(d => `
        <article class="drill-card">
          <a class="thumb" href="#/board/${d.id}" aria-label="פתיחת ${U.esc(d.name || 'תרגיל')}">${d.thumb ? `<img src="${d.thumb}" alt="">` : ''}</a>
          <div class="body">
            <h3>${U.esc(d.name || 'תרגיל ללא שם')}</h3>
            <div class="meta">${[d.cat, d.age, d.duration ? d.duration + ' דק׳' : '', d.frames.length > 1 ? d.frames.length + ' שלבים' : '', d.variants?.length ? (d.variants.length + 1) + ' אופציות' : ''].filter(Boolean).map(U.esc).join(' · ') || '&nbsp;'}</div>
            ${d.desc ? `<p class="desc">${U.esc(d.desc)}</p>` : ''}
            ${d.tags ? `<div class="row" style="gap:4px">${d.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 4).map(t => `<span class="tag">${U.esc(t)}</span>`).join('')}</div>` : ''}
          </div>
          <div class="actions">
            <a class="btn sm" href="#/board/${d.id}">${U.icon('edit', 16)} עריכה</a>
            <button class="btn sm icon" data-vid="${d.id}" title="סרטון">${U.icon('video', 16)}</button>
            <button class="btn sm icon" data-link="${d.id}" title="קישור">${U.icon('link', 16)}</button>
            <button class="btn sm icon" data-dup="${d.id}" title="שכפול">${U.icon('copy', 16)}</button>
          </div>
        </article>`).join('')}</div>` : `<div class="empty"><h3>לא נמצאו תרגילים</h3><p>נסה מילה אחרת או בחר "הכל".</p></div>`;
    }
    paint();
    const q = U.$('#q', view);
    if (q) q.oninput = () => { filter.q = q.value; paint(); };
    const cats = U.$('#cats', view);
    if (cats) cats.onclick = e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      filter.cat = b.dataset.c; U.$$('.chip', cats).forEach(c => c.classList.toggle('on', c === b)); paint();
    };
    grid.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = drills.find(x => x.id === (b.dataset.vid || b.dataset.link || b.dataset.dup));
      if (!d) return;
      if (b.dataset.vid) Board.videoFlow(d);
      if (b.dataset.link) Board.linkModal(d);
      if (b.dataset.dup) {
        const c = JSON.parse(JSON.stringify(d));
        c.id = DB.uid(); c.name = (d.name || 'תרגיל') + ' (עותק)'; delete c.createdAt;
        await DB.put('drills', c); U.toast('התרגיל שוכפל'); render(view);
      }
    };
  }
  return { render };
})();
