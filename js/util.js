/* כלים משותפים */
const U = (() => {
  const ICONS = {
    home:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    board:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
    drills:'<path d="M12 2l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    sessions:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 15h3"/>',
    docs:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    tasks:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 5-6"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    play:'<path d="M7 4l13 8-13 8z"/>',
    pause:'<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
    share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    upload:'<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    video:'<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-4v12l-6-4z"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
    undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    sparkles:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    x:'<path d="M18 6L6 18M6 6l12 12"/>',
    up:'<path d="M18 15l-6-6-6 6"/>',
    down:'<path d="M6 9l6 6 6-6"/>',
    move:'<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
    erase:'<path d="M20 20H8l-5-5 10-10 8 8-6 6"/><path d="M7 10l7 7"/>',
    note:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    whatsapp:'<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-.9-.4-1.6-1.1-2-2l.8-1-1-2z"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check:'<path d="M5 12l5 5 9-11"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    back:'<path d="M9 18l6-6-6-6"/>',
  };
  function icon(name, size = 20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* תאריכים */
  const pad = n => String(n).padStart(2, '0');
  const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const DAYS_S = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
  const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  function fmtDate(s, withDay = true) {
    const d = typeof s === 'string' ? parseISO(s) : s; if (!d) return '';
    return `${withDay ? 'יום ' + DAYS[d.getDay()] + ', ' : ''}${d.getDate()} ב${MONTHS[d.getMonth()]}`;
  }
  const fmtShort = s => { const d = parseISO(s); return d ? `${d.getDate()}.${d.getMonth() + 1}` : ''; };
  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
  const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoDate(d); };

  /* הודעות */
  function toast(msg, err = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
    $('#toast').appendChild(t);
    setTimeout(() => t.remove(), err ? 4200 : 2400);
  }

  /* חלון */
  function modal({ title = '', body = '', foot = '', wide = false, onOpen } = {}) {
    const root = $('#modal-root');
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h2>${esc(title)}</h2><button class="btn ghost icon" data-close aria-label="סגירה">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    root.appendChild(back);
    const m = back.querySelector('.modal');
    m.close = close;
    if (onOpen) onOpen(m, close);
    const f = m.querySelector('input,textarea,select'); if (f && !('ontouchstart' in window)) f.focus();
    return m;
  }
  function confirm(text, okLabel = 'מחיקה') {
    return new Promise(res => {
      modal({
        title: 'לאשר?', body: `<p>${esc(text)}</p>`,
        foot: `<button class="btn primary" data-ok>${esc(okLabel)}</button><button class="btn" data-close>ביטול</button>`,
        onOpen: (m, close) => {
          m.querySelector('[data-ok]').onclick = () => { close(); res(true); };
          m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => res(false)));
        }
      });
    });
  }

  /* קבצים */
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function shareFile(blob, name, text = '') {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name, text }); return true; }
      catch (e) { if (e.name === 'AbortError') return true; }
    }
    download(blob, name);
    toast('הקובץ ירד למחשב — אפשר לצרף אותו לוואטסאפ');
    return false;
  }
  const blobToDataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  async function dataURLToBlob(url) { return (await fetch(url)).blob(); }
  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  async function compressImage(file, max = 1600, quality = .82) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
    } finally { URL.revokeObjectURL(url); }
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }

  /* דחיסה לקישור */
  const b64url = bytes => { let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64url = str => { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const s = atob(str); return Uint8Array.from(s, c => c.charCodeAt(0)); };
  async function packJSON(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) {
      const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return 'z' + b64url(new Uint8Array(await new Response(cs).arrayBuffer()));
    }
    return 'j' + b64url(bytes);
  }
  async function unpackJSON(str) {
    const kind = str[0], bytes = unb64url(str.slice(1));
    if (kind === 'z') {
      const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return JSON.parse(await new Response(ds).text());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /* Markdown פשוט להצגת המלצות */
  function md(text) {
    const lines = esc(text || '').split('\n'); let out = '', list = null;
    const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
    const closeList = () => { if (list) { out += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trim();
      let m;
      if (!l) { closeList(); continue; }
      if ((m = l.match(/^#{1,4}\s+(.*)/))) { closeList(); out += `<h3>${inline(m[1])}</h3>`; }
      else if ((m = l.match(/^[-*•]\s+(.*)/))) { if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; }
      else { closeList(); out += `<p>${inline(l)}</p>`; }
    }
    closeList(); return out;
  }

  /* חיפוש עברי: מסיר ניקוד וגרשיים */
  const norm = s => String(s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/["'״׳]/g, '');

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  return { icon, esc, $, $$, isoDate, parseISO, fmtDate, fmtShort, daysBetween, addDays, DAYS, DAYS_S, MONTHS,
    toast, modal, confirm, download, shareFile, blobToDataURL, dataURLToBlob, loadImage, compressImage, loadScript,
    packJSON, unpackJSON, md, norm, debounce, fmtSize };
})();
