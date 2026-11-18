/* לוח המשחקים של הפועל ירושלים בליגת Winner ובגביע, מתוך אתר מנהלת הליגה (basket.co.il).
   רץ בשרת של Vercel, כי האתר של המנהלת לא מאפשר לדפדפן לקרוא ממנו ישירות.
   התוצאה נשמרת בזיכרון של Vercel לשעה, כדי לא להעמיס על אתר המנהלת. */
const TEAM_ID = 2114;   // הפועל ירושלים באתר המנהלת

const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const teamCell = c => ({ id: +((c.match(/TeamId=(\d+)/i) || [])[1] || 0), name: strip((c.match(/game_item mid">([\s\S]*?)<\/div>/) || [, c])[1]) });

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const r = await fetch(`https://basket.co.il/team.asp?TeamId=${TEAM_ID}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36', 'Accept-Language': 'he-IL,he;q=0.9' },
    });
    if (!r.ok) throw new Error('אתר המנהלת החזיר ' + r.status);
    const html = await r.text();
    const games = [];
    for (const row of html.split(/<tr\b/i).slice(1)) {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
      if (cells.length < 5) continue;
      const d = strip(cells[0]).match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!d || !/TeamId=/i.test(cells[3] + cells[4])) continue;
      const final = !/לא סופי/.test(strip(cells[0] + ' ' + cells[1]));
      const t = final ? (strip(cells[1]).match(/\d{1,2}:\d{2}/) || strip(cells[0]).match(/\d{1,2}:\d{2}/) || [''])[0] : '';
      const home = teamCell(cells[3]), away = teamCell(cells[4]);
      games.push({
        date: `${d[3]}-${d[2]}-${d[1]}`, time: t ? t.padStart(5, '0') : '', stage: strip(cells[2]),
        home: home.name, away: away.name, isHome: home.id === TEAM_ID, result: strip(cells[5] || ''),
      });
    }
    if (!games.length) throw new Error('לא נמצא לוח משחקים בדף של המנהלת');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.end(JSON.stringify({ games }));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: e.message }));
  }
};
