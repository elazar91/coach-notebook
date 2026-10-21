/* ספריית מסמכים: קבצים, פתקים וקישורים, עם חיפוש בתוך הטקסט */
const Docs = (() => {
  const CATS = ['תרגילים', 'תכניות עבודה', 'טקטיקה ומהלכים', 'כושר ומניעת פציעות', 'חוקים ושיפוט', 'ניהול ומנהלה', 'הורים ותקשורת', 'למידה והשראה', 'אחר'];
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFW = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
  let filter = { q: '', cat: '' };

  function kindOf(d) {
    if (d.kind === 'note') return ['note', 'פתק'];
    if (d.kind === 'link') return ['link', 'קישור'];
    const t = d.fileType || '', n = (d.fileName || '').toLowerCase();
    if (t === 'application/pdf' || n.endsWith('.pdf')) return ['pdf', 'PDF'];
    if (t.startsWith('image/')) return ['img', 'תמונה'];
    if (n.endsWith('.docx') || n.endsWith('.doc')) return ['doc', 'Word'];
    if (n.endsWith('.xlsx') || n.endsWith('.csv')) return ['doc', 'טבלה'];
    if (t.startsWith('video/')) return ['img', 'וידאו'];
    return ['', (n.split('.').pop() || 'קובץ').toUpperCase().slice(0, 4)];
  }

  /* חילוץ טקסט לחיפוש */
  async function extractText(file) {
    const n = file.name.toLowerCase();
    try {
      if (file.type.startsWith('text/') || /\.(txt|md|csv|json)$/.test(n)) return (await file.text()).slice(0, 300000);
      if (file.type === 'application/pdf' || n.endsWith('.pdf')) {
        await U.loadScript(PDFJS);
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFW;
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        let out = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 120); i++) {
          const c = await (await pdf.getPage(i)).getTextContent();
          out += c.items.map(x => x.str).join(' ') + '\n';
          if (out.length > 300000) break;
        }
        return out;
      }
      if (n.endsWith('.docx')) {
        await U.loadScript(MAMMOTH);
        const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        return (r.value || '').slice(0, 300000);
      }
    } catch (e) { console.warn('text extraction failed', e); }
    return '';
  }

  function match(d, terms) {
    if (!terms.length) return { ok: true };
    const head = U.norm([d.title, d.tags, d.notes, d.cat, d.fileName, d.url].join(' '));
    const body = U.norm((d.body || '') + ' ' + (d.text || ''));
    const ok = terms.every(t => head.includes(t) || body.includes(t));
    if (!ok) return { ok: false };
    // קטע מהטקסט סביב ההתאמה הראשונה בגוף המסמך
    const raw = (d.body || '') + ' ' + (d.text || '');
    const nraw = U.norm(raw);
    const t = terms.find(x => nraw.includes(x));
    if (!t) return { ok: true };
    const i = nraw.indexOf(t);
    const ratio = raw.length / Math.max(1, nraw.length);
    const a = Math.max(0, Math.floor(i * ratio) - 70), b = Math.min(raw.length, Math.floor(i * ratio) + 130);
    let snip = U.esc((a ? '…' : '') + raw.slice(a, b).replace(/\s+/g, ' ') + (b < raw.length ? '…' : ''));
    terms.forEach(x => { if (x.length > 1) snip = snip.replace(new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); });
    return { ok: true, snip };
  }

  async function render(view) {
    const docs = (await DB.all('docs')).sort((a, b) => b.updatedAt - a.updatedAt);
    view.innerHTML = `
      <div class="page-head">
        <div><h1>מסמכים</h1><p>חומרים לחזור אליהם: תכניות, מאמרים, חוקים, פתקים מקורסים</p></div>
        <div class="row">
          <button class="btn" id="new-note">${U.icon('note', 18)} פתק</button>
          <button class="btn" id="new-link">${U.icon('link', 18)} קישור</button>
          <label class="btn primary">${U.icon('upload', 18)} העלאת קבצים<input type="file" id="up" multiple hidden></label>
        </div>
      </div>
      <div class="dropzone" id="drop" style="margin-bottom:16px">אפשר גם לגרור לכאן קבצים — PDF, Word, תמונות, טקסט</div>
      <div class="stack" style="margin-bottom:16px">
        <div class="search"><input class="input" id="q" placeholder="חיפוש בכותרות, בתגיות ובתוך הטקסט של המסמכים" value="${U.esc(filter.q)}">${U.icon('search', 18)}</div>
        <div class="chips" id="cats"><button class="chip ${!filter.cat ? 'on' : ''}" data-c="">הכל</button>${CATS.map(c => `<button class="chip ${filter.cat === c ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
      </div>
      <div id="rows"></div>`;
    const rows = U.$('#rows', view);
    const paint = () => {
      if (!docs.length) { rows.innerHTML = `<div class="empty"><h3>עוד אין מסמכים</h3><p>העלה קובץ, שמור קישור לסרטון או מאמר, או כתוב פתק מקורס מאמנים. הכל נשמר וניתן לחיפוש.</p></div>`; return; }
      const terms = U.norm(filter.q).split(/\s+/).filter(Boolean);
      const L = docs.map(d => ({ d, m: (!filter.cat || d.cat === filter.cat) ? match(d, terms) : { ok: false } })).filter(x => x.m.ok);
      rows.innerHTML = L.length ? `<div class="list">${L.map(({ d, m }) => {
        const [cls, label] = kindOf(d);
        return `<div class="doc-row" data-id="${d.id}" tabindex="0" role="button">
          <div class="doc-icon ${cls}">${label}</div>
          <div style="min-width:0"><h3>${U.esc(d.title)}</h3>
            <div class="row small muted" style="gap:8px">${d.cat ? `<span class="tag ball">${U.esc(d.cat)}</span>` : ''}${(d.tags || '').split(',').map(t => t.trim()).filter(Boolean).map(t => `<span class="tag">${U.esc(t)}</span>`).join('')}<span>${new Date(d.createdAt).toLocaleDateString('he-IL')}</span></div>
            ${m.snip ? `<div class="snippet">${m.snip}</div>` : d.notes ? `<div class="snippet">${U.esc(d.notes.slice(0, 160))}</div>` : ''}</div>
          <span class="small muted">${d.size ? U.fmtSize(d.size) : ''}</span>
        </div>`;
      }).join('')}</div>` : `<div class="empty"><h3>לא נמצא</h3><p>לא מצאתי "${U.esc(filter.q)}". נסה מילה אחרת או חלק ממילה.</p></div>`;
    };
    paint();
    const q = U.$('#q', view); q.oninput = U.debounce(() => { filter.q = q.value; paint(); }, 150);
    U.$('#cats', view).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; filter.cat = b.dataset.c; U.$$('#cats .chip', view).forEach(c => c.classList.toggle('on', c === b)); paint(); };
    const open = id => openDoc(docs.find(d => d.id === id), () => render(view));
    rows.onclick = e => { const r = e.target.closest('[data-id]'); if (r) open(r.dataset.id); };
    rows.onkeydown = e => { if (e.key === 'Enter') { const r = e.target.closest('[data-id]'); if (r) open(r.dataset.id); } };

    async function upload(files) {
      if (!files.length) return;
      const m = U.modal({ title: 'שומר מסמכים…', body: '<p class="muted" id="upmsg"></p><div class="progress"><i></i></div>' });
      let i = 0;
      for (const f of files) {
        m.querySelector('#upmsg').textContent = `${f.name} (${++i}/${files.length}) — קורא את הטקסט לחיפוש`;
        let blob = f;
        if (f.type.startsWith('image/') && f.size > 2.5e6) blob = await U.compressImage(f, 2200, .85);
        const fileId = await DB.saveFile(blob, f.name);
        const text = await extractText(f);
        await DB.put('docs', { kind: 'file', title: f.name.replace(/\.[^.]+$/, ''), cat: filter.cat || '', tags: '', notes: '', fileId, fileName: f.name, fileType: f.type, size: blob.size, text });
        m.querySelector('.progress i').style.width = Math.round(i / files.length * 100) + '%';
      }
      m.close(); U.toast(files.length === 1 ? 'המסמך נשמר' : `${files.length} מסמכים נשמרו`); render(view);
    }
    U.$('#up', view).onchange = e => upload([...e.target.files]);
    const drop = U.$('#drop', view);
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); upload([...e.dataTransfer.files]); };
    U.$('#new-note', view).onclick = () => openDoc({ kind: 'note', title: '', cat: filter.cat, tags: '', notes: '', body: '' }, () => render(view), true);
    U.$('#new-link', view).onclick = () => openDoc({ kind: 'link', title: '', cat: filter.cat, tags: '', notes: '', url: '' }, () => render(view), true);
  }

  async function openDoc(d, onDone, isNew = false) {
    const file = d.fileId ? await DB.getFile(d.fileId) : null;
    const url = file ? URL.createObjectURL(file.blob) : null;
    const [cls] = kindOf(d);
    const preview = cls === 'img' && url && (d.fileType || '').startsWith('image/') ? `<img src="${url}" alt="" style="max-width:100%;max-height:320px;border-radius:8px;display:block;margin-bottom:12px">` : '';
    const m = U.modal({
      title: isNew ? (d.kind === 'note' ? 'פתק חדש' : 'קישור חדש') : 'פרטי המסמך', wide: d.kind === 'note',
      body: `${preview}<div class="stack">
        <label class="field"><span>כותרת</span><input class="input" id="dt" value="${U.esc(d.title)}"></label>
        ${d.kind === 'link' ? `<label class="field"><span>כתובת</span><input class="input" id="du" type="url" dir="ltr" value="${U.esc(d.url)}" placeholder="https://"></label>` : ''}
        ${d.kind === 'note' ? `<label class="field"><span>תוכן</span><textarea class="input" id="db" rows="12">${U.esc(d.body)}</textarea></label>` : ''}
        <div class="grid-2">
          <label class="field"><span>קטגוריה</span><select class="input" id="dc"><option value="">—</option>${CATS.map(c => `<option ${d.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="field"><span>תגיות</span><input class="input" id="dg" value="${U.esc(d.tags)}" placeholder="מופרדות בפסיק"></label>
        </div>
        ${d.kind !== 'note' ? `<label class="field"><span>הערות שלי</span><textarea class="input" id="dn" rows="3" placeholder="מה חשוב במסמך הזה, מתי להשתמש בו">${U.esc(d.notes)}</textarea></label>` : ''}
        ${file ? `<p class="small muted">${U.esc(d.fileName)} · ${U.fmtSize(file.size)}${d.text ? ' · הטקסט זמין לחיפוש' : ' · אין טקסט לחיפוש בקובץ הזה, הוסף הערות ותגיות'}</p>` : ''}
      </div>`,
      foot: `<button class="btn primary" data-save>שמירה</button>
        ${url ? `<a class="btn" href="${url}" target="_blank" rel="noopener">${U.icon('back', 16)} פתיחה</a><button class="btn" data-dl>${U.icon('download', 16)} הורדה</button>` : ''}
        ${d.kind === 'link' && d.url ? `<a class="btn" href="${U.esc(d.url)}" target="_blank" rel="noopener">${U.icon('link', 16)} מעבר לקישור</a>` : ''}
        ${!isNew ? `<button class="btn ghost danger" data-del>${U.icon('trash', 16)} מחיקה</button>` : ''}`,
      onOpen: (m, close) => {
        m.querySelector('[data-save]').onclick = async () => {
          d.title = m.querySelector('#dt').value.trim();
          if (d.kind === 'link') d.url = m.querySelector('#du').value.trim();
          if (d.kind === 'note') d.body = m.querySelector('#db').value;
          d.cat = m.querySelector('#dc').value; d.tags = m.querySelector('#dg').value;
          const n = m.querySelector('#dn'); if (n) d.notes = n.value;
          if (!d.title) d.title = d.kind === 'note' ? (d.body || '').split('\n')[0].slice(0, 60) || 'פתק' : d.kind === 'link' ? d.url : 'מסמך';
          await DB.put('docs', d); close(); U.toast('נשמר'); onDone();
        };
        const dl = m.querySelector('[data-dl]'); if (dl) dl.onclick = () => U.download(file.blob, d.fileName);
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (!await U.confirm(`למחוק את "${d.title}"?`)) return;
          if (d.fileId) await DB.del('files', d.fileId);
          await DB.del('docs', d.id); close(); onDone();
        };
      }
    });
    return m;
  }

  return { render, CATS };
})();
