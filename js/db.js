/* שכבת אחסון — IndexedDB בדפדפן.
   כל הגישה לנתונים עוברת דרך האובייקט הזה, כך שבעתיד (כמה משתמשים / ענן)
   מחליפים רק את הקובץ הזה בשירות ענן (למשל Supabase או Firebase) עם אותן פונקציות. */
const DB = (() => {
  const NAME = 'coach-notebook', VER = 1;
  const STORES = ['drills', 'sessions', 'docs', 'tasks', 'files', 'settings'];
  let dbp;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = () => {
        const db = r.result;
        STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      let out;
      if (req) req.onsuccess = () => { out = req.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const all = s => tx(s, 'readonly', st => st.getAll()).then(a => a || []);
  const get = (s, id) => tx(s, 'readonly', st => st.get(id));
  /* silent=true: כתיבה שמגיעה מהענן, לא צריך להעלות אותה שוב */
  const put = (s, obj, touch = true, silent = false) => {
    if (!obj.id) obj.id = uid();
    if (touch) obj.updatedAt = Date.now();
    if (!obj.createdAt) obj.createdAt = Date.now();
    return tx(s, 'readwrite', st => st.put(obj)).then(() => { if (!silent && typeof Sync !== 'undefined') Sync.track(s, obj.id); return obj; });
  };
  const del = (s, id, silent = false) => tx(s, 'readwrite', st => st.delete(id)).then(() => { if (!silent && typeof Sync !== 'undefined') Sync.track(s, id, true); });
  const clear = s => tx(s, 'readwrite', st => st.clear());

  /* קבצים (תמונות, מסמכים) נשמרים בנפרד */
  async function saveFile(blob, name) {
    const f = { id: uid(), blob, name: name || 'file', type: blob.type, size: blob.size };
    await put('files', f);
    return f.id;
  }
  const getFile = id => get('files', id);

  /* הגדרות */
  const DEFAULT_SETTINGS = { id: 'main', coachName: '', teams: [], apiKey: '', model: 'claude-sonnet-5-5' };
  async function settings() { return Object.assign({}, DEFAULT_SETTINGS, await get('settings', 'main')); }
  async function saveSettings(patch) { const s = await settings(); Object.assign(s, patch); return put('settings', s); }

  /* גיבוי מלא לקובץ JSON (כולל תמונות וקבצים) */
  async function exportAll(onProgress) {
    const out = { app: 'coach-notebook', version: 1, exportedAt: new Date().toISOString(), data: {} };
    for (const s of STORES) {
      const rows = await all(s);
      if (s === 'files') {
        out.data.files = [];
        for (let i = 0; i < rows.length; i++) {
          const f = rows[i];
          out.data.files.push({ ...f, blob: await U.blobToDataURL(f.blob) });
          onProgress && onProgress(i + 1, rows.length);
        }
      } else out.data[s] = rows;
    }
    return new Blob([JSON.stringify(out)], { type: 'application/json' });
  }
  async function importAll(file, replace = false) {
    const json = JSON.parse(await file.text());
    if (json.app !== 'coach-notebook') throw new Error('זה לא קובץ גיבוי של מחברת המאמן');
    for (const s of STORES) {
      if (!json.data[s]) continue;
      if (replace) await clear(s);
      for (const row of json.data[s]) {
        if (s === 'files') row.blob = await U.dataURLToBlob(row.blob);
        await put(s, row, false);
      }
    }
  }
  /* מוחק רק מהמכשיר הזה; אם יש גיבוי בענן הנתונים יימשכו מחדש */
  async function wipe() { for (const s of STORES) await clear(s); if (typeof Sync !== 'undefined') Sync.resetCursor(); }

  return { open, uid, all, get, put, del, saveFile, getFile, settings, saveSettings, exportAll, importAll, wipe };
})();
