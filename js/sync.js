/* סנכרון לענן: כל שינוי נשמר קודם במכשיר, ואז עולה ל-Supabase.
   מכשירים אחרים מושכים את השינויים כשהאתר נפתח, כשחוזרים אליו, ופעם בדקה. */
const Sync = (() => {
  const STORES = ['drills', 'sessions', 'docs', 'tasks', 'files', 'settings'];
  const LS_OUT = 'coach-sync-outbox', LS_PULL = 'coach-sync-last', LS_TIME = 'coach-sync-time';
  let client = null, user = null, busy = false, again = false;
  let status = 'off', lastError = '';
  const listeners = new Set();

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  function emit() { listeners.forEach(f => { try { f(info()); } catch (e) {} }); }
  function setStatus(s, err = '') { status = s; lastError = err; emit(); }
  function info() {
    return { status, error: lastError, email: user?.email || '', pending: Object.keys(ls.get(LS_OUT, {})).length,
      lastSync: ls.get(LS_TIME, 0), available: !!client };
  }

  /* תור שינויים שעוד לא עלו */
  function track(store, id, deleted = false) {
    if (!STORES.includes(store) || id == null) return;
    const o = ls.get(LS_OUT, {});
    o[store + '|' + id] = { store, id, deleted, t: Date.now() };
    ls.set(LS_OUT, o);
    if (user) schedule();
    else emit();
  }
  let tmr;
  function schedule(ms = 2000) { clearTimeout(tmr); tmr = setTimeout(run, ms); }

  async function init() {
    if (!window.supabase || !CONFIG.supabaseUrl) { setStatus('unavailable'); return; }
    client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'coach-notebook-auth' },
    });
    try {
      const { data } = await client.auth.getSession();
      user = data.session?.user || null;
    } catch (e) { user = null; }
    client.auth.onAuthStateChange((_e, s) => { const was = !!user; user = s?.user || null; if (!user && was) setStatus('off'); });
    if (user) run(); else setStatus('off');
    setInterval(() => user && run(), 60000);
    window.addEventListener('focus', () => user && schedule(300));
    window.addEventListener('online', () => user && schedule(300));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && user) schedule(300); });
  }

  async function signIn(email, password) {
    if (!client) throw new Error('אין חיבור לשירות הענן. בדוק את החיבור לאינטרנט ורענן את הדף.');
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (/invalid/i.test(error.message)) throw new Error('האימייל או הסיסמה לא נכונים.');
      throw new Error(error.message);
    }
    user = data.user;
    // מכשיר שמתחבר בפעם הראשונה: מעלים את כל מה שכבר קיים בו
    if (!ls.get(LS_PULL, null)) await queueAll();
    await run();
  }
  async function signOut() {
    if (client) await client.auth.signOut();
    user = null; ls.del(LS_PULL); ls.del(LS_TIME);
    setStatus('off');
  }
  async function queueAll() {
    const o = ls.get(LS_OUT, {});
    for (const s of STORES) for (const r of await DB.all(s)) o[s + '|' + r.id] = { store: s, id: r.id, deleted: false, t: Date.now() };
    ls.set(LS_OUT, o);
  }

  async function run() {
    if (!user || !client) return;
    if (busy) { again = true; return; }
    busy = true; setStatus('syncing');
    try {
      await push();
      const changed = await pull();
      ls.set(LS_TIME, Date.now());
      setStatus('ok');
      if (changed) window.dispatchEvent(new CustomEvent('coach-synced', { detail: { changed } }));
    } catch (e) {
      console.warn('sync failed', e);
      const msg = !navigator.onLine ? 'אין אינטרנט — השינויים שמורים במכשיר ויעלו כשיחזור החיבור' : (e.message || 'הסנכרון נכשל');
      if (/JWT|session|token/i.test(msg)) { await signOut(); setStatus('off', 'החיבור פג. התחבר שוב.'); }
      else setStatus('error', msg);
    } finally {
      busy = false;
      if (again) { again = false; schedule(500); }
    }
  }

  const path = id => `${user.id}/${id}`;

  async function push() {
    const out = ls.get(LS_OUT, {});
    const entries = Object.entries(out);
    if (!entries.length) return;
    const rows = [], done = [];
    for (const [k, e] of entries) {
      const rec = e.deleted ? null : await DB.get(e.store, e.id);
      if (!rec) {
        rows.push({ user_id: user.id, store: e.store, id: String(e.id), data: null, deleted: true });
        if (e.store === 'files') await client.storage.from(CONFIG.bucket).remove([path(e.id)]).catch(() => {});
      } else {
        let data = rec;
        if (e.store === 'files') {
          const { error } = await client.storage.from(CONFIG.bucket).upload(path(rec.id), rec.blob, { upsert: true, contentType: rec.type || 'application/octet-stream' });
          if (error) throw new Error('העלאת קובץ נכשלה: ' + error.message);
          data = { ...rec }; delete data.blob;
        }
        if (e.store === 'settings') { data = { ...rec }; delete data.apiKey; }
        rows.push({ user_id: user.id, store: e.store, id: String(rec.id), data, deleted: false });
      }
      done.push([k, e.t]);
      if (rows.length >= 40) { await upsert(rows.splice(0)); clearDone(done.splice(0)); }
    }
    if (rows.length) { await upsert(rows); clearDone(done); }
  }
  async function upsert(rows) {
    const { error } = await client.from(CONFIG.table).upsert(rows, { onConflict: 'user_id,store,id' });
    if (error) throw new Error(error.message);
  }
  function clearDone(list) {
    const o = ls.get(LS_OUT, {});
    for (const [k, t] of list) if (o[k] && o[k].t === t) delete o[k];
    ls.set(LS_OUT, o); emit();
  }

  async function pull() {
    let since = ls.get(LS_PULL, '1970-01-01T00:00:00+00:00');
    let changed = 0;
    const pending = ls.get(LS_OUT, {});
    for (;;) {
      const { data, error } = await client.from(CONFIG.table).select('*').gt('updated_at', since).order('updated_at', { ascending: true }).limit(200);
      if (error) throw new Error(error.message);
      if (!data.length) break;
      for (const row of data) {
        since = row.updated_at;
        if (pending[row.store + '|' + row.id]) continue; // שינוי מקומי שעוד לא עלה גובר
        const local = await DB.get(row.store, row.id);
        if (row.deleted) {
          if (local) { await DB.del(row.store, row.id, true); changed++; }
          continue;
        }
        const remote = row.data || {};
        if (local && (local.updatedAt || 0) >= (remote.updatedAt || 0)) continue;
        let rec = remote;
        if (row.store === 'files') {
          const { data: blob, error: de } = await client.storage.from(CONFIG.bucket).download(path(row.id));
          if (de || !blob) continue;
          rec = { ...remote, blob: remote.type ? new Blob([blob], { type: remote.type }) : blob };
        }
        if (row.store === 'settings' && local?.apiKey) rec = { ...rec, apiKey: local.apiKey };
        await DB.put(row.store, rec, false, true);
        changed++;
      }
      ls.set(LS_PULL, since);
      if (data.length < 200) break;
    }
    return changed;
  }

  function onChange(f) { listeners.add(f); f(info()); return () => listeners.delete(f); }
  /* אחרי מחיקה מקומית של הכל: למשוך מחדש מהענן */
  function resetCursor() { ls.del(LS_PULL); ls.del(LS_OUT); }

  return { init, track, signIn, signOut, run, onChange, info, resetCursor, isOn: () => !!user };
})();
