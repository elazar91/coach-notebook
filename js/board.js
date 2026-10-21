/* לוח סרטוט תרגילים: עורך, נגן, ייצוא סרטון/תמונה/קישור, ומסך צפייה בקישור משותף */
const Board = (() => {
  const CATS = ['חימום', 'כדרור', 'מסירות', 'קליעה', 'הגנה', 'התקפה', 'מעברים', 'משחקונים', 'כושר', 'אחר'];
  const LINE_NAMES = { run: 'ריצה', dribble: 'כדרור', pass: 'מסירה', screen: 'חסימה' };
  const TOOLS = [
    { id: 'move', label: 'הזזה', svg: '<path d="M5 3l14 8-6 2-2 6z"/>' },
    { id: 'off', label: 'התקפה', svg: '<circle cx="12" cy="12" r="8" fill="currentColor"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="#fff" stroke="none" font-weight="700">1</text>' },
    { id: 'def', label: 'הגנה', svg: '<path d="M6 6l12 12M18 6L6 18" stroke-width="3"/>' },
    { id: 'coach', label: 'מאמן', svg: '<rect x="4" y="4" width="16" height="16" rx="1"/>' },
    { id: 'cone', label: 'קונוס', svg: '<path d="M12 4l7 15H5z"/>' },
    { id: 'ball', label: 'כדור', svg: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4v16"/>' },
    'sep',
    { id: 'run', label: 'ריצה', svg: '<path d="M4 18C8 10 14 8 20 6"/><path d="M15 4l5 2-3 4"/>' },
    { id: 'dribble', label: 'כדרור', svg: '<path d="M3 16l2-3 2 3 2-3 2 3 2-3 2 3"/><path d="M17 11l4 2-4 2"/>' },
    { id: 'pass', label: 'מסירה', svg: '<path d="M4 18l14-12" stroke-dasharray="3 3"/><path d="M13 5l5 1-1 5"/>' },
    { id: 'screen', label: 'חסימה', svg: '<path d="M5 19L17 7"/><path d="M14 4l6 6" stroke-width="3"/>' },
    'sep',
    { id: 'erase', label: 'מחיקה', svg: '<path d="M20 20H8l-5-5 10-10 8 8-6 6"/><path d="M7 10l7 7"/>' },
  ];
  const isLineTool = t => ['run', 'dribble', 'pass', 'screen'].includes(t);

  const newDrill = () => ({
    id: DB.uid(), name: '', cat: '', age: '', duration: '', players: '', desc: '', tags: '',
    court: 'half', speed: 1.6, seq: 0, objects: [],
    frames: [{ pos: {}, ball: null, lines: [], note: '' }],
  });

  /* ---------- נגן: ציור וקנבס ---------- */
  function sizeCanvas(canvas, drill, maxH) {
    const box = canvas.parentElement;
    const W = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2;
    const d = Court.dims(drill.court);
    let H = W * (d.h + 1.2) / (d.w + 1.2);
    let w = W;
    if (maxH && H > maxH) { H = maxH; w = H * (d.w + 1.2) / (d.h + 1.2); }
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = w + 'px'; canvas.style.height = H + 'px';
    canvas.style.margin = '0 auto';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(H * dpr);
    return { W: w, H, dpr };
  }

  /* ---------- ייצוא: כרזה וסרטון ---------- */
  async function ensureFonts() {
    try { await Promise.all([document.fonts.load('40px "Secular One"'), document.fonts.load('700 30px Assistant')]); } catch (e) { /* ממשיכים בגופן ברירת מחדל */ }
  }
  function posterLayout(drill, W) {
    const d = Court.dims(drill.court);
    const head = Math.round(W * 0.11), foot = Math.round(W * 0.085);
    const courtH = Math.round(W * (d.h + 1) / (d.w + 1));
    let H = head + courtH + foot; H += H % 2;
    return { W, H, head, foot, courtH };
  }
  function renderPosterCanvas(drill, W, opts) {
    const L = posterLayout(drill, W);
    const c = document.createElement('canvas'); c.width = L.W; c.height = L.H;
    const ctx = c.getContext('2d');
    const courtC = document.createElement('canvas'); courtC.width = L.W; courtC.height = L.courtH;
    const cctx = courtC.getContext('2d');
    const draw = o => {
      Court.render(cctx, L.W, L.courtH, drill, { ...o, pad: Math.round(L.W * 0.025) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(courtC, 0, L.head);
      drawHeaderFooter(ctx, drill, L, o);
    };
    draw(opts);
    return { canvas: c, draw, L };
  }
  function drawHeaderFooter(ctx, drill, L, opts) {
    ctx.fillStyle = '#14213d'; ctx.fillRect(0, 0, L.W, L.head);
    ctx.fillStyle = '#ee6a1f'; ctx.fillRect(0, L.head - 6, L.W, 6);
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const x = L.W - L.W * 0.035;
    ctx.fillStyle = '#fff'; ctx.font = `${Math.round(L.head * 0.38)}px "Secular One", Assistant, sans-serif`;
    ctx.fillText(drill.name || 'תרגיל', x, L.head * 0.42);
    const sub = [drill.cat, drill.age, drill.duration ? drill.duration + ' דק׳' : ''].filter(Boolean).join('   ');
    if (sub) { ctx.font = `600 ${Math.round(L.head * 0.2)}px Assistant, sans-serif`; ctx.fillStyle = '#c9d2e3'; ctx.fillText(sub, x, L.head * 0.77); }
    const y0 = L.H - L.foot;
    ctx.fillStyle = '#14213d'; ctx.fillRect(0, y0, L.W, L.foot);
    const t = typeof opts.t === 'number' ? opts.t : (opts.frame || 0);
    const fi = Math.min(Math.floor(t + 1e-6), drill.frames.length - 1);
    const note = drill.frames[fi].note || '';
    let used = 0;
    if (drill.frames.length > 1) {
      const label = `שלב ${fi + 1}/${drill.frames.length}`;
      ctx.font = `700 ${Math.round(L.foot * 0.32)}px Assistant, sans-serif`; ctx.fillStyle = '#ee6a1f';
      ctx.fillText(label, x, y0 + L.foot / 2);
      used = ctx.measureText(label).width + L.W * 0.03;
    }
    if (note) {
      ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.round(L.foot * 0.3)}px Assistant, sans-serif`;
      let s = note;
      const maxW = L.W * 0.93 - used;
      while (s.length > 3 && ctx.measureText(s).width > maxW) s = s.slice(0, -2);
      if (s !== note) s = s.trim() + '…';
      ctx.fillText(s, x - used, y0 + L.foot / 2);
    }
  }

  async function exportImage(drill, frame) {
    await ensureFonts();
    const { canvas } = renderPosterCanvas(drill, 1400, { frame });
    return new Promise(r => canvas.toBlob(r, 'image/png'));
  }

  function pickMime() {
    if (!window.MediaRecorder) return null;
    const list = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return list.find(m => MediaRecorder.isTypeSupported(m)) || null;
  }
  async function exportVideo(drill, onProgress) {
    const mime = pickMime();
    if (!mime) throw new Error('הדפדפן הזה לא תומך ביצירת סרטון. נסה בכרום או בספארי עדכני.');
    await ensureFonts();
    const W = drill.court === 'full' ? 1280 : 1080;
    const { canvas, draw } = renderPosterCanvas(drill, W, { t: 0 });
    const n = drill.frames.length;
    const step = drill.speed || 1.6, hold = 0.45, startHold = 0.9, endHold = 1.6;
    const total = startHold + (n - 1) * (step + hold) + endHold;
    const timeToT = sec => {
      let s = sec - startHold;
      if (s <= 0) return 0;
      for (let i = 0; i < n - 1; i++) {
        if (s < step) return i + s / step;
        s -= step;
        if (s < hold) return i + 1;
        s -= hold;
      }
      return n - 1;
    };
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(res => rec.onstop = res);
    rec.start(250);
    const t0 = performance.now();
    await new Promise(res => {
      const tick = () => {
        const sec = (performance.now() - t0) / 1000;
        draw({ t: timeToT(sec) });
        onProgress && onProgress(Math.min(1, sec / total));
        if (sec < total) requestAnimationFrame(tick); else res();
      };
      tick();
    });
    rec.stop();
    await done;
    stream.getTracks().forEach(t => t.stop());
    const type = mime.split(';')[0];
    return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm' };
  }

  /* קישור לצפייה: התרגיל כולו מקודד בתוך הקישור */
  function compact(drill) {
    const r = v => Math.round(v * 100) / 100;
    return {
      v: 1, name: drill.name, cat: drill.cat, age: drill.age, duration: drill.duration, desc: drill.desc,
      court: drill.court, speed: drill.speed, objects: drill.objects.map(o => ({ id: o.id, t: o.t, n: o.n })),
      frames: drill.frames.map(f => ({
        pos: Object.fromEntries(Object.entries(f.pos).map(([k, p]) => [k, [r(p[0]), r(p[1])]])),
        ball: f.ball ? (f.ball.h ? { h: f.ball.h } : { p: [r(f.ball.p[0]), r(f.ball.p[1])] }) : null,
        lines: (f.lines || []).map(l => ({ type: l.type, pts: l.pts.map(p => [r(p[0]), r(p[1])]) })),
        note: f.note || '',
      })),
    };
  }
  async function shareLink(drill) {
    const packed = await U.packJSON(compact(drill));
    return location.href.split('#')[0] + '#view=' + packed;
  }
  const fileName = (drill, ext) => (drill.name || 'תרגיל').replace(/[\\/:*?"<>|]/g, '').trim() + '.' + ext;

  function fileResultModal(blob, name, kind, drill) {
    const url = URL.createObjectURL(blob);
    const preview = kind === 'video'
      ? `<video src="${url}" controls autoplay muted loop playsinline style="width:100%;border-radius:8px;background:#000"></video>`
      : `<img src="${url}" alt="" style="width:100%;border-radius:8px">`;
    const note = kind === 'video' && name.endsWith('.webm')
      ? '<p class="hint" style="margin-top:10px">הדפדפן הזה יצר קובץ WebM. וואטסאפ בטלפון לא תמיד מנגן אותו — בכרום עדכני או בספארי באייפון נוצר MP4 שעובד בכל מקום.</p>' : '';
    U.modal({
      title: kind === 'video' ? 'הסרטון מוכן' : 'התמונה מוכנה', wide: false,
      body: preview + note + `<p class="small muted" style="margin-top:8px">בטלפון, "שיתוף" פותח את תפריט השיתוף — בוחרים וואטסאפ. במחשב הקובץ יורד, ומצרפים אותו בוואטסאפ ווב.</p>`,
      foot: `<button class="btn primary" data-share>${U.icon('share')} שיתוף</button><button class="btn" data-dl>${U.icon('download')} הורדה</button>`,
      onOpen: m => {
        m.querySelector('[data-share]').onclick = () => U.shareFile(blob, name, drill.name || '');
        m.querySelector('[data-dl]').onclick = () => U.download(blob, name);
      }
    });
  }
  async function linkModal(drill) {
    const url = await shareLink(drill);
    const local = location.protocol === 'file:';
    const text = `${drill.name || 'תרגיל'} — לצפייה בתרגיל המונפש:\n${url}`;
    U.modal({
      title: 'קישור לצפייה',
      body: `<p class="small muted">כל התרגיל שמור בתוך הקישור עצמו. מי שפותח אותו רואה את האנימציה ויכול לשמור עותק אצלו.</p>
        ${local ? '<p class="hint">האתר פתוח כרגע מקובץ במחשב, ולכן הקישור יעבוד רק אצלך. אחרי העלאה לגיטהאב פייג׳ס הקישור יעבוד לכל אחד.</p>' : ''}
        <textarea class="input" readonly rows="3" style="direction:ltr;font-size:.8rem">${U.esc(url)}</textarea>`,
      foot: `<a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">${U.icon('whatsapp')} שליחה בוואטסאפ</a>
        <button class="btn" data-copy>${U.icon('copy')} העתקה</button>
        ${navigator.share ? `<button class="btn" data-share>${U.icon('share')} שיתוף</button>` : ''}`,
      onOpen: m => {
        m.querySelector('[data-copy]').onclick = async () => { await navigator.clipboard.writeText(url); U.toast('הקישור הועתק'); };
        const s = m.querySelector('[data-share]');
        if (s) s.onclick = () => navigator.share({ title: drill.name || 'תרגיל', text: drill.name || '', url }).catch(() => {});
      }
    });
  }
  async function videoFlow(drill) {
    if (drill.frames.length < 2) { U.toast('כדי ליצור סרטון צריך לפחות שני שלבים. הוסף שלב והזז את השחקנים.', true); return; }
    const m = U.modal({ title: 'יוצר סרטון…', body: '<p class="muted">האנימציה מתנגנת ומוקלטת בזמן אמת. השאר את החלון פתוח.</p><div class="progress"><i></i></div>' });
    const bar = m.querySelector('.progress i');
    try {
      const { blob, ext } = await exportVideo(drill, p => bar.style.width = Math.round(p * 100) + '%');
      m.close();
      fileResultModal(blob, fileName(drill, ext), 'video', drill);
    } catch (e) { m.close(); U.toast(e.message || 'יצירת הסרטון נכשלה', true); }
  }
  async function imageFlow(drill, frame) {
    const blob = await exportImage(drill, frame);
    fileResultModal(blob, fileName(drill, 'png'), 'image', drill);
  }

  /* ---------- פריסות מהירות ---------- */
  const toCourt = (court, p) => (court === 'full' ? [28 - p[1], 15 - p[0]] : p);
  const BASKET = [7.5, 1.575];
  const PRESETS = {
    spread: { label: '5 שחקני התקפה', off: [[7.5, 9.2], [2.4, 6.2], [12.6, 6.2], [1.2, 1.4], [13.8, 1.4]], def: false },
    five: { label: '5 מול 5', off: [[7.5, 9.2], [2.4, 6.2], [12.6, 6.2], [1.2, 1.4], [13.8, 1.4]], def: true },
    lines: { label: 'שני טורים', off: [[11.5, 8.6], [11.5, 9.8], [11.5, 11], [3.5, 8.6], [3.5, 9.8], [3.5, 11]], def: false, cones: [[11.5, 7.3], [3.5, 7.3]] },
    pair: { label: '1 מול 1', off: [[7.5, 8.5]], def: true },
  };

  /* ---------- עורך ---------- */
  async function editor(view, id) {
    let drill = id && id !== 'new' ? await DB.get('drills', id) : null;
    const isNew = !drill;
    if (!drill) drill = newDrill();
    if (!drill.frames?.length) drill.frames = [{ pos: {}, ball: null, lines: [], note: '' }];
    let saved = !isNew;
    let tool = 'move', fi = 0, sel = null, selLine = null, draft = null, drag = null, playing = false, t = 0, raf = 0;
    const undo = [], redo = [];
    const snap = () => JSON.stringify({ objects: drill.objects, frames: drill.frames, court: drill.court, seq: drill.seq });
    let last = snap();

    view.innerHTML = `
      <div class="page-head">
        <div class="grow">
          <a href="#/drills" class="small muted" style="text-decoration:none">${U.icon('back', 14)} ספריית התרגילים</a>
          <input class="input" id="d-name" placeholder="שם התרגיל" value="${U.esc(drill.name)}" style="font-family:var(--font-head);font-size:1.5rem;border-color:transparent;background:transparent;padding-inline:0;margin-top:4px">
        </div>
        <div class="row"><span class="save-state" id="save-state">${saved ? 'שמור' : 'טיוטה — יישמר אוטומטית'}</span></div>
      </div>
      <div class="board-wrap">
        <div class="board-main">
          <div class="toolbar" id="tools">
            ${TOOLS.map(tl => tl === 'sep' ? '<span class="tool-sep"></span>' :
              `<button class="tool" data-tool="${tl.id}" title="${tl.label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tl.svg}</svg>${tl.label}</button>`).join('')}
            <span class="tool-sep"></span>
            <button class="tool" data-act="undo" title="ביטול">${U.icon('undo')}ביטול</button>
            <button class="tool" data-act="redo" title="חזרה">${U.icon('redo')}חזרה</button>
          </div>
          <div class="canvas-box"><canvas id="cv" aria-label="לוח התרגיל"></canvas></div>
          <div class="frames" id="frames"></div>
          <div class="row">
            <input class="input grow" id="f-note" placeholder="מה קורה בשלב הזה? (מופיע בסרטון)" style="min-width:200px">
          </div>
          <div class="play-row">
            <button class="btn dark" id="play">${U.icon('play', 18)} הפעלה</button>
            <input type="range" id="scrub" min="0" max="0" step="0.01" value="0" aria-label="ציר זמן">
            <label class="small muted row" style="gap:6px">מהירות
              <select class="input" id="speed" style="width:auto;min-height:34px;padding:4px 8px">
                <option value="2.4">איטי</option><option value="1.6">רגיל</option><option value="1">מהיר</option>
              </select></label>
          </div>
        </div>
        <div class="side-panel">
          <div class="panel">
            <div class="panel-head"><h3>שליחה</h3></div>
            <div class="share-btns">
              <button class="btn primary" id="x-video">${U.icon('video')} סרטון לוואטסאפ</button>
              <button class="btn" id="x-image">${U.icon('image')} תמונה של השלב</button>
              <button class="btn" id="x-link">${U.icon('link')} קישור לצפייה</button>
            </div>
          </div>
          <div class="panel" id="sel-panel"></div>
          <div class="panel">
            <div class="panel-head"><h3>פרטי התרגיל</h3></div>
            <div class="stack">
              <div class="grid-2">
                <label class="field"><span>קטגוריה</span><select class="input" data-f="cat"><option value="">—</option>${CATS.map(c => `<option ${drill.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
                <label class="field"><span>מגרש</span><select class="input" id="court"><option value="half">חצי מגרש</option><option value="full">מגרש מלא</option></select></label>
                <label class="field"><span>גילאים</span><input class="input" data-f="age" value="${U.esc(drill.age)}" placeholder="למשל ד׳-ו׳"></label>
                <label class="field"><span>משך (דק׳)</span><input class="input" data-f="duration" type="number" min="0" value="${U.esc(drill.duration)}"></label>
              </div>
              <label class="field"><span>מספר שחקנים</span><input class="input" data-f="players" value="${U.esc(drill.players)}" placeholder="למשל 8-12"></label>
              <label class="field"><span>מה עושים ומה המטרה</span><textarea class="input" data-f="desc" id="d-desc" rows="5" placeholder="איך מארגנים, מה עושים, מה המטרה ועל מה לשים דגש">${U.esc(drill.desc)}</textarea></label>
              <button class="btn sm" id="ai-desc" style="align-self:flex-start">${U.icon('sparkles', 16)} Claude יכתוב הסבר</button>
              <label class="field"><span>תגיות</span><input class="input" data-f="tags" value="${U.esc(drill.tags)}" placeholder="פיק אנד רול, לייאפ, יד חלשה"></label>
              <button class="btn danger" id="del-drill">${U.icon('trash', 18)} מחיקת התרגיל</button>
            </div>
          </div>
        </div>
      </div>`;

    const cv = U.$('#cv', view), ctx = cv.getContext('2d');
    let dimsPx = { W: 0, H: 0, dpr: 1 }, vp = null;
    U.$('#court', view).value = drill.court;
    U.$('#speed', view).value = String(drill.speed || 1.6);

    function resize() {
      const maxH = window.innerWidth > 1020 ? window.innerHeight * 0.68 : null;
      dimsPx = sizeCanvas(cv, drill, maxH);
      draw();
    }
    function draw() {
      if (!cv.isConnected) return;
      vp = Court.render(ctx, dimsPx.W, dimsPx.H, drill, playing || (t > 0 && !Number.isInteger(t))
        ? { t, dpr: dimsPx.dpr }
        : { frame: fi, dpr: dimsPx.dpr, ghost: true, sel, selLine, draft });
    }
    const toWorld = e => {
      const r = cv.getBoundingClientRect();
      return [(e.clientX - r.left - vp.ox) / vp.s, (e.clientY - r.top - vp.oy) / vp.s];
    };
    const frame = () => drill.frames[fi];

    function commit() {
      const s = snap();
      if (s === last) return;
      undo.push(last); if (undo.length > 60) undo.shift();
      redo.length = 0; last = s;
      scheduleSave();
    }
    function restore(s) {
      const o = JSON.parse(s);
      Object.assign(drill, o); last = s;
      fi = Math.min(fi, drill.frames.length - 1); sel = null; selLine = null;
      renderFrames(); renderSel(); scheduleSave(); draw();
    }

    /* שמירה אוטומטית */
    const stateEl = U.$('#save-state', view);
    const doSave = async () => {
      drill.thumb = Court.thumbnail(drill);
      await DB.put('drills', drill);
      saved = true; stateEl.textContent = 'נשמר';
      if (location.hash.endsWith('/new')) history.replaceState(null, '', '#/board/' + drill.id);
    };
    const saveDeb = U.debounce(doSave, 700);
    function scheduleSave() { stateEl.textContent = 'שומר…'; saveDeb(); }

    /* כלים */
    function setTool(id) {
      tool = id; sel = null; selLine = null;
      U.$$('[data-tool]', view).forEach(b => b.classList.toggle('on', b.dataset.tool === id));
      cv.style.cursor = id === 'move' ? 'grab' : id === 'erase' ? 'not-allowed' : 'crosshair';
      renderSel(); draw();
    }
    U.$('#tools', view).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tool) setTool(b.dataset.tool);
      if (b.dataset.act === 'undo' && undo.length) { redo.push(last); restore(undo.pop()); }
      if (b.dataset.act === 'redo' && redo.length) { undo.push(last); restore(redo.pop()); }
    });

    function hitObject(p) {
      const f = frame();
      for (let i = drill.objects.length - 1; i >= 0; i--) {
        const o = drill.objects[i], q = f.pos[o.id];
        if (q && Court.dist(p, q) < Court.R * 1.25) return o;
      }
      return null;
    }
    function hitBall(p) { const b = Court.ballAt(drill, fi); return b && Court.dist(p, b) < 0.45; }
    function hitLine(p) {
      const segDist = (p, a, b) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
        let k = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; k = Math.max(0, Math.min(1, k));
        return Math.hypot(p[0] - a[0] - k * dx, p[1] - a[1] - k * dy);
      };
      const lines = frame().lines || [];
      for (let i = lines.length - 1; i >= 0; i--) {
        const pts = lines[i].pts;
        for (let j = 1; j < pts.length; j++) if (segDist(p, pts[j - 1], pts[j]) < 0.45) return lines[i];
      }
      return null;
    }
    function nextLabel(type) {
      if (type === 'coach') return 'מ';
      if (type === 'cone') return '';
      const used = new Set(drill.objects.filter(o => o.t === type).map(o => o.n));
      let k = 1; while (used.has(String(k))) k++;
      return String(k);
    }
    function addObject(type, p) {
      const o = { id: 'o' + (++drill.seq), t: type, n: nextLabel(type) };
      drill.objects.push(o);
      drill.frames.forEach(f => f.pos[o.id] = [p[0], p[1]]);
      return o;
    }
    function removeObject(id) {
      drill.objects = drill.objects.filter(o => o.id !== id);
      drill.frames.forEach(f => { delete f.pos[id]; if (f.ball?.h === id) f.ball = null; });
    }
    function clampP(p) { const d = Court.dims(drill.court); return [Math.max(-0.4, Math.min(d.w + 0.4, p[0])), Math.max(-0.4, Math.min(d.h + 0.4, p[1]))]; }

    cv.addEventListener('pointerdown', e => {
      if (playing) return;
      if (t !== fi) { t = fi; U.$('#scrub', view).value = fi; }
      cv.setPointerCapture(e.pointerId);
      const p = toWorld(e);
      const hitO = hitObject(p);
      if (tool === 'move' || (['off', 'def', 'coach', 'cone'].includes(tool) && hitO)) {
        if (tool === 'move' && hitBall(p) && !(hitO && Court.dist(p, frame().pos[hitO.id]) < Court.R * .7)) {
          drag = { ball: true }; return;
        }
        if (hitO) { sel = hitO.id; drag = { id: hitO.id, moved: false }; cv.style.cursor = 'grabbing'; }
        else { sel = null; selLine = hitLine(p)?.id || null; }
        renderSel(); draw(); return;
      }
      if (['off', 'def', 'coach', 'cone'].includes(tool)) {
        const o = addObject(tool, clampP(p)); sel = o.id;
        commit(); renderSel(); draw(); return;
      }
      if (tool === 'ball') {
        const f = frame();
        if (hitO && hitO.t !== 'cone') f.ball = f.ball?.h === hitO.id ? null : { h: hitO.id };
        else f.ball = { p: clampP(p) };
        commit(); draw(); return;
      }
      if (tool === 'erase') {
        if (hitO) { removeObject(hitO.id); U.toast('נמחק — אפשר לבטל'); }
        else if (hitBall(p)) frame().ball = null;
        else { const l = hitLine(p); if (l) frame().lines = frame().lines.filter(x => x !== l); }
        commit(); renderSel(); draw(); return;
      }
      if (isLineTool(tool)) {
        let start = p;
        if (hitO) start = frame().pos[hitO.id].slice();
        else if (tool === 'pass' && frame().ball && hitBall(p)) start = Court.ballAt(drill, fi);
        draft = { type: tool, pts: [start] };
        draw();
      }
    });
    cv.addEventListener('pointermove', e => {
      if (!drag && !draft) return;
      const p = clampP(toWorld(e));
      if (drag?.ball) { frame().ball = { p }; draw(); return; }
      if (drag) { frame().pos[drag.id] = p; drag.moved = true; draw(); return; }
      if (draft) {
        const lastP = draft.pts[draft.pts.length - 1];
        if (Court.dist(lastP, p) > 0.25) { draft.pts.push(p); draw(); }
        else if (draft.pts.length > 1) { draft.pts[draft.pts.length - 1] = p; draw(); }
      }
    });
    const endPointer = e => {
      if (drag?.ball) {
        const p = toWorld(e), o = hitObject(p);
        if (o && o.t !== 'cone') frame().ball = { h: o.id };
        drag = null; commit(); draw(); return;
      }
      if (drag) { drag = null; cv.style.cursor = tool === 'move' ? 'grab' : 'crosshair'; commit(); draw(); return; }
      if (draft) {
        const pts = draft.pts;
        let L = 0; for (let i = 1; i < pts.length; i++) L += Court.dist(pts[i - 1], pts[i]);
        if (L > 0.7) {
          // הצמדת הסוף לשחקן קרוב במסירה
          const endO = hitObject(pts[pts.length - 1]);
          if (endO && draft.type === 'pass') pts[pts.length - 1] = frame().pos[endO.id].slice();
          // פישוט נקודות
          const simple = [pts[0]];
          for (let i = 1; i < pts.length - 1; i++) if (Court.dist(simple[simple.length - 1], pts[i]) > 0.45) simple.push(pts[i]);
          simple.push(pts[pts.length - 1]);
          const line = { id: 'l' + (++drill.seq), type: draft.type, pts: draft.type === 'pass' ? [simple[0], simple[simple.length - 1]] : simple };
          (frame().lines ||= []).push(line);
          draft = null; commit();
        } else draft = null;
        draw();
      }
    };
    cv.addEventListener('pointerup', endPointer);
    cv.addEventListener('pointercancel', endPointer);

    /* פאנל השחקן המסומן */
    function renderSel() {
      const box = U.$('#sel-panel', view);
      const o = drill.objects.find(x => x.id === sel);
      const line = !o && selLine && (frame().lines || []).find(l => l.id === selLine);
      if (o) {
        const names = { off: 'שחקן התקפה', def: 'שחקן הגנה', coach: 'מאמן', cone: 'קונוס' };
        box.classList.remove('hidden');
        box.innerHTML = `<div class="panel-head"><h3>${names[o.t]}</h3></div>
          <div class="row">${o.t !== 'cone' ? `<label class="field grow"><span>תווית</span><input class="input" id="sel-n" maxlength="3" value="${U.esc(o.n)}"></label>` : ''}
          <button class="btn danger" id="sel-del" style="align-self:flex-end">${U.icon('trash', 18)} מחיקה</button></div>`;
        const inp = U.$('#sel-n', box);
        if (inp) inp.oninput = () => { o.n = inp.value; draw(); };
        if (inp) inp.onchange = () => commit();
        U.$('#sel-del', box).onclick = () => { removeObject(o.id); sel = null; commit(); renderSel(); draw(); };
      } else if (line) {
        box.classList.remove('hidden');
        box.innerHTML = `<div class="panel-head"><h3>קו ${LINE_NAMES[line.type]}</h3></div>
          <div class="row"><select class="input grow" id="line-type">${Object.entries(LINE_NAMES).map(([k, v]) => `<option value="${k}" ${k === line.type ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <button class="btn danger" id="line-del">${U.icon('trash', 18)}</button></div>`;
        U.$('#line-type', box).onchange = e => { line.type = e.target.value; commit(); draw(); renderSel(); };
        U.$('#line-del', box).onclick = () => { frame().lines = frame().lines.filter(l => l !== line); selLine = null; commit(); renderSel(); draw(); };
      } else if (!drill.objects.length) {
        box.classList.remove('hidden');
        box.innerHTML = `<div class="panel-head"><h3>התחלה מהירה</h3></div>
          <p class="small muted">בחר כלי ולחץ על המגרש כדי להציב, או התחל מפריסה מוכנה:</p>
          <div class="share-btns">${Object.entries(PRESETS).map(([k, v]) => `<button class="btn sm" data-preset="${k}">${v.label}</button>`).join('')}</div>`;
        box.onclick = e => {
          const k = e.target.closest('[data-preset]')?.dataset.preset; if (!k) return;
          const pr = PRESETS[k];
          const offs = pr.off.map(p => addObject('off', toCourt(drill.court, p)));
          if (pr.def) pr.off.forEach(p => addObject('def', toCourt(drill.court, [p[0] + (BASKET[0] - p[0]) * .2, p[1] + (BASKET[1] - p[1]) * .2])));
          (pr.cones || []).forEach(p => addObject('cone', toCourt(drill.court, p)));
          drill.frames.forEach(f => f.ball = { h: offs[0].id });
          box.onclick = null; setTool('move'); commit(); renderSel(); draw();
        };
      } else {
        box.classList.add('hidden'); box.innerHTML = '';
      }
    }

    /* שלבים */
    function renderFrames() {
      const box = U.$('#frames', view);
      box.innerHTML = drill.frames.map((f, i) => `<button class="frame-chip ${i === fi ? 'on' : ''}" data-f="${i}">שלב ${i + 1}</button>`).join('') +
        `<button class="btn sm" data-add>${U.icon('plus', 16)} שלב הבא</button>` +
        (drill.frames.length > 1 ? `<button class="btn sm ghost danger" data-delf title="מחיקת השלב">${U.icon('trash', 16)}</button>` : '');
      U.$('#f-note', view).value = frame().note || '';
      const sc = U.$('#scrub', view); sc.max = drill.frames.length - 1; sc.value = fi;
    }
    U.$('#frames', view).addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      stop();
      if (b.dataset.f) { fi = +b.dataset.f; t = fi; }
      if (b.hasAttribute('data-add')) {
        const f = frame();
        const nf = { pos: JSON.parse(JSON.stringify(f.pos)), ball: f.ball ? JSON.parse(JSON.stringify(f.ball)) : null, lines: [], note: '' };
        drill.frames.splice(fi + 1, 0, nf); fi++; t = fi; commit();
        if (drill.frames.length === 2) U.toast('עכשיו הזז את השחקנים למיקום החדש. הקווים שציירת בשלב הקודם יקבעו את מסלול התנועה.');
      }
      if (b.hasAttribute('data-delf')) {
        if (!await U.confirm(`למחוק את שלב ${fi + 1}?`)) return;
        drill.frames.splice(fi, 1); fi = Math.max(0, fi - 1); t = fi; commit();
      }
      sel = null; selLine = null; renderFrames(); renderSel(); draw();
    });
    const noteEl = U.$('#f-note', view);
    noteEl.oninput = () => { frame().note = noteEl.value; };
    noteEl.onchange = () => commit();

    /* ניגון */
    function stop() { playing = false; cancelAnimationFrame(raf); U.$('#play', view).innerHTML = `${U.icon('play', 18)} הפעלה`; }
    U.$('#play', view).onclick = () => {
      if (playing) { stop(); return; }
      if (drill.frames.length < 2) { U.toast('הוסף שלב נוסף והזז את השחקנים כדי לראות אנימציה'); return; }
      playing = true; U.$('#play', view).innerHTML = `${U.icon('pause', 18)} עצירה`;
      if (t >= drill.frames.length - 1) t = 0;
      let prev = null;
      const tick = now => {
        if (!playing || !cv.isConnected) return;
        if (prev === null) prev = now;
        t += Math.max(0, now - prev) / 1000 / (drill.speed || 1.6); prev = now;
        if (t >= drill.frames.length - 1) { t = drill.frames.length - 1; fi = t; stop(); renderFrames(); }
        U.$('#scrub', view).value = t; draw();
        if (playing) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    U.$('#scrub', view).oninput = e => {
      stop(); t = +e.target.value;
      if (Math.abs(t - Math.round(t)) < 0.03) { t = Math.round(t); fi = t; renderFrames(); }
      draw();
    };
    U.$('#speed', view).onchange = e => { drill.speed = +e.target.value; scheduleSave(); };

    /* פרטים */
    U.$('#d-name', view).oninput = e => { drill.name = e.target.value; scheduleSave(); };
    U.$$('[data-f]', view).forEach(inp => inp.addEventListener('input', () => { drill[inp.dataset.f] = inp.value; scheduleSave(); }));
    U.$('#court', view).onchange = e => {
      const to = e.target.value;
      // המרת מיקומים בין חצי מגרש למגרש מלא
      const conv = to === 'full' ? p => toCourt('full', p) : p => [15 - p[1], 28 - p[0]];
      drill.frames.forEach(f => {
        Object.keys(f.pos).forEach(k => f.pos[k] = conv(f.pos[k]));
        if (f.ball?.p) f.ball.p = conv(f.ball.p);
        (f.lines || []).forEach(l => l.pts = l.pts.map(conv));
      });
      drill.court = to; commit(); resize();
    };
    U.$('#ai-desc', view).onclick = async e => {
      const btn = e.currentTarget;
      if (!drill.name.trim() && !drill.objects.length) { U.toast('תן לתרגיל שם או סרטט אותו קודם', true); return; }
      const cnt = t => drill.objects.filter(o => o.t === t).length;
      const lines = {}; drill.frames.forEach(f => (f.lines || []).forEach(l => lines[l.type] = (lines[l.type] || 0) + 1));
      const prompt = `כתוב הסבר לתרגיל כדורסל ששורטט בלוח הטקטי.
שם: ${drill.name || 'ללא שם'}
${drill.cat ? 'קטגוריה: ' + drill.cat + '\n' : ''}${drill.age ? 'גילאים: ' + drill.age + '\n' : ''}${drill.players ? 'מספר שחקנים: ' + drill.players + '\n' : ''}${drill.duration ? 'משך: ' + drill.duration + ' דקות\n' : ''}מגרש: ${drill.court === 'full' ? 'מלא' : 'חצי'}
בשרטוט: ${cnt('off')} שחקני התקפה, ${cnt('def')} שחקני הגנה${cnt('cone') ? ', ' + cnt('cone') + ' קונוסים' : ''}${cnt('coach') ? ', מאמן' : ''}. ${drill.frames.length} שלבים.
קווים: ${Object.entries(lines).map(([k, v]) => ({ run: 'ריצה', dribble: 'כדרור', pass: 'מסירה', screen: 'חסימה' }[k] + ' ×' + v)).join(', ') || 'אין'}
${drill.frames.map((f, i) => f.note ? `שלב ${i + 1}: ${f.note}` : '').filter(Boolean).join('\n')}
${drill.desc ? 'מה שהמאמן כבר כתב (שמור על הכוונה שלו והשלם): ' + drill.desc : ''}

כתוב בעברית פשוטה, בפורמט הזה בדיוק (בלי כותרות נוספות):
מה עושים: 2-4 משפטים — ארגון, מהלך התרגיל וכללים.
מטרה: משפט אחד.
דגשים: 2-3 נקודות לימוד קצרות, מופרדות בפסיק.
אם השם לא מוכר לך, כתוב את הפרשנות הסבירה ביותר לפי השרטוט והשם, והתחל במילה "(הנחה)".`;
      const label = btn.innerHTML; btn.disabled = true; btn.textContent = 'Claude כותב…';
      try {
        const ans = await AI.ask(prompt, [], 'אתה מאמן כדורסל בכיר שכותב תיעוד קצר ומעשי לתרגילים.');
        if (ans) { drill.desc = ans.trim(); U.$('#d-desc', view).value = drill.desc; scheduleSave(); U.toast('ההסבר נכתב — אפשר לערוך אותו'); }
      } catch (err) { U.toast(err.message, true); }
      finally { btn.disabled = false; btn.innerHTML = label; }
    };
    U.$('#del-drill', view).onclick = async () => {
      if (!await U.confirm('למחוק את התרגיל לצמיתות?')) return;
      if (saved) await DB.del('drills', drill.id);
      location.hash = '#/drills';
    };

    /* ייצוא */
    U.$('#x-video', view).onclick = () => { stop(); videoFlow(drill); };
    U.$('#x-image', view).onclick = () => imageFlow(drill, fi);
    U.$('#x-link', view).onclick = () => linkModal(drill);

    /* מקלדת */
    const onKey = e => {
      if (!cv.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.target.matches('input,textarea,select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) U.$('[data-act=redo]', view).click(); else U.$('[data-act=undo]', view).click(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (sel || selLine)) {
        if (sel) removeObject(sel); else frame().lines = frame().lines.filter(l => l.id !== selLine);
        sel = selLine = null; commit(); renderSel(); draw();
      }
    };
    document.addEventListener('keydown', onKey);
    const ro = new ResizeObserver(() => { if (cv.isConnected) resize(); else ro.disconnect(); });
    ro.observe(U.$('.canvas-box', view));

    setTool('move'); renderFrames(); renderSel(); resize();
    await ensureFonts(); draw();
  }

  /* ---------- צפייה בקישור משותף ---------- */
  async function viewer(view, packed) {
    let drill;
    try { drill = await U.unpackJSON(packed); }
    catch (e) { view.innerHTML = `<div class="empty"><h3>הקישור פגום</h3><p>ייתכן שהוא נחתך בהעתקה. בקש מהשולח לשלוח אותו שוב.</p><a class="btn" href="#/home">למסך הבית</a></div>`; return; }
    drill.objects ||= []; drill.frames ||= [{ pos: {}, lines: [] }];
    let t = 0, playing = false, raf = 0;
    view.innerHTML = `<div class="viewer">
      <div class="page-head"><div><h1>${U.esc(drill.name || 'תרגיל')}</h1>
        <p>${U.esc([drill.cat, drill.age, drill.duration ? drill.duration + ' דקות' : ''].filter(Boolean).join(' · '))}</p></div></div>
      <div class="canvas-box"><canvas id="cv"></canvas></div>
      <div class="play-row"><button class="btn dark" id="play">${U.icon('play', 18)} הפעלה</button>
        <input type="range" id="scrub" min="0" max="${drill.frames.length - 1}" step="0.01" value="0" aria-label="ציר זמן"></div>
      <p id="note" class="muted" style="min-height:1.5em;margin-top:8px"></p>
      ${drill.desc ? `<div class="panel" style="margin-top:12px"><h3>הסבר ונקודות לימוד</h3><p style="white-space:pre-wrap;margin-top:8px">${U.esc(drill.desc)}</p></div>` : ''}
      <div class="row" style="margin-top:16px">
        <button class="btn primary" id="keep">${U.icon('plus', 18)} שמירה בספרייה שלי</button>
        <button class="btn" id="vid">${U.icon('video', 18)} הורדת סרטון</button>
      </div></div>`;
    const cv = U.$('#cv', view), ctx = cv.getContext('2d');
    let px;
    const draw = () => {
      Court.render(ctx, px.W, px.H, drill, { t, dpr: px.dpr });
      const fi = Math.min(Math.floor(t + 1e-6), drill.frames.length - 1);
      U.$('#note', view).textContent = drill.frames.length > 1 ? `שלב ${fi + 1}: ${drill.frames[fi].note || ''}` : (drill.frames[0].note || '');
    };
    const resize = () => { px = sizeCanvas(cv, drill, window.innerHeight * .7); draw(); };
    const btn = U.$('#play', view);
    const stop = () => { playing = false; cancelAnimationFrame(raf); btn.innerHTML = `${U.icon('play', 18)} הפעלה`; };
    btn.onclick = () => {
      if (playing) return stop();
      if (t >= drill.frames.length - 1) t = 0;
      playing = true; btn.innerHTML = `${U.icon('pause', 18)} עצירה`;
      let prev = null;
      const tick = now => {
        if (!playing || !cv.isConnected) return;
        if (prev === null) prev = now;
        t = Math.min(drill.frames.length - 1, t + Math.max(0, now - prev) / 1000 / (drill.speed || 1.6)); prev = now;
        U.$('#scrub', view).value = t; draw();
        if (t >= drill.frames.length - 1) stop(); else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    U.$('#scrub', view).oninput = e => { stop(); t = +e.target.value; draw(); };
    U.$('#keep', view).onclick = async () => {
      const d = Object.assign(newDrill(), drill, { id: DB.uid(), tags: '' });
      d.seq = 1000; d.thumb = Court.thumbnail(d);
      await DB.put('drills', d);
      U.toast('התרגיל נשמר בספרייה');
      location.hash = '#/board/' + d.id;
    };
    U.$('#vid', view).onclick = () => videoFlow(drill);
    new ResizeObserver(() => cv.isConnected && resize()).observe(U.$('.canvas-box', view));
    resize();
    await ensureFonts(); draw();
    if (drill.frames.length > 1) setTimeout(() => btn.click(), 500);
  }

  return { editor, viewer, CATS, videoFlow, imageFlow, linkModal, newDrill };
})();
