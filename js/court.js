/* מנוע ציור המגרש והתרגיל — משותף לעורך, לצפייה, לסרטון ולתמונה.
   יחידות: מטרים. חצי מגרש 15x14 (הסל למעלה), מגרש מלא 28x15.
   מבנה תרגיל:
   objects: [{id, t:'off'|'def'|'coach'|'cone', n:'1'}]
   frames:  [{pos:{id:[x,y]}, ball:{h:id}|{p:[x,y]}|null, lines:[{id,type,pts:[[x,y]..]}], note}] */
const Court = (() => {
  const HALF = { w: 15, h: 14 }, FULL = { w: 28, h: 15 };
  const dims = c => (c === 'full' ? FULL : HALF);
  const R = 0.55;          // רדיוס שחקן
  const COLORS = { off: '#14213d', def: '#c53030', coach: '#2f855a', cone: '#ee6a1f', line: '#14213d', ball: '#ee6a1f' };

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const ease = f => (f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);

  function fit(court, W, H, pad = 14) {
    const d = dims(court);
    const s = Math.min((W - 2 * pad) / d.w, (H - 2 * pad) / d.h);
    return { s, ox: (W - d.w * s) / 2, oy: (H - d.h * s) / 2, d };
  }

  /* ---------- מגרש ---------- */
  function halfLines(ctx) {
    const a1 = Math.atan2(1.415, 6.6);
    ctx.beginPath();
    ctx.rect(5.05, 0, 4.9, 5.8);
    ctx.moveTo(7.5 + 1.8, 5.8); ctx.arc(7.5, 5.8, 1.8, 0, Math.PI * 2);
    ctx.moveTo(0.9, 0); ctx.lineTo(0.9, 2.99);
    ctx.moveTo(14.1, 0); ctx.lineTo(14.1, 2.99);
    ctx.moveTo(14.1, 2.99); ctx.arc(7.5, 1.575, 6.75, a1, Math.PI - a1, false);
    ctx.moveTo(7.5 + 1.25, 1.575); ctx.arc(7.5, 1.575, 1.25, 0, Math.PI, false);
    ctx.moveTo(6.6, 1.2); ctx.lineTo(8.4, 1.2);
    ctx.stroke();
  }
  function halfPaint(ctx) { ctx.fillRect(5.05, 0, 4.9, 5.8); }
  function halfRim(ctx) {
    ctx.beginPath(); ctx.arc(7.5, 1.575, 0.225, 0, Math.PI * 2); ctx.stroke();
  }
  function eachHalf(ctx, court, fn) {
    if (court === 'full') {
      ctx.save(); ctx.transform(0, 1, 1, 0, 0, 0); fn(); ctx.restore();
      ctx.save(); ctx.transform(0, -1, -1, 0, 28, 15); fn(); ctx.restore();
    } else fn();
  }
  function drawCourt(ctx, court, s) {
    const d = dims(court);
    // רצפה
    ctx.fillStyle = '#e8c27e'; ctx.fillRect(0, 0, d.w, d.h);
    ctx.strokeStyle = 'rgba(120,72,20,.10)'; ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (let x = 0.75; x < d.w; x += 0.75) { ctx.moveTo(x, 0); ctx.lineTo(x, d.h); }
    ctx.stroke();
    // צבע ברחבה
    ctx.fillStyle = 'rgba(20,33,61,.14)';
    eachHalf(ctx, court, () => halfPaint(ctx));
    // קווים
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.07, 1.6 / s);
    ctx.strokeRect(0, 0, d.w, d.h);
    ctx.beginPath();
    if (court === 'full') {
      ctx.moveTo(14, 0); ctx.lineTo(14, 15);
      ctx.moveTo(14 + 1.8, 7.5); ctx.arc(14, 7.5, 1.8, 0, Math.PI * 2);
    } else {
      ctx.moveTo(7.5 + 1.8, 14); ctx.arc(7.5, 14, 1.8, 0, Math.PI, true);
    }
    ctx.stroke();
    eachHalf(ctx, court, () => halfLines(ctx));
    ctx.strokeStyle = '#ee6a1f'; ctx.lineWidth = Math.max(0.06, 1.8 / s);
    eachHalf(ctx, court, () => halfRim(ctx));
  }

  /* ---------- קווים ---------- */
  function smoothPath(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 2) { ctx.lineTo(pts[1][0], pts[1][1]); return; }
    for (let i = 1; i < pts.length - 1; i++) {
      const m = lerp(pts[i], pts[i + 1], .5);
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
    }
    const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
  }
  function resample(pts, step) {
    const out = [pts[0]]; let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = dist(a, b);
      let t = step - carry;
      while (t <= L) { out.push(lerp(a, b, t / L)); t += step; }
      carry = L - (t - step);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function endDir(pts) {
    const b = pts[pts.length - 1];
    for (let i = pts.length - 2; i >= 0; i--) if (dist(pts[i], b) > 0.3) return Math.atan2(b[1] - pts[i][1], b[0] - pts[i][0]);
    const a = pts[0]; return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  function arrowHead(ctx, tip, ang, size = 0.5) {
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(tip[0] - size * Math.cos(ang - 0.45), tip[1] - size * Math.sin(ang - 0.45));
    ctx.lineTo(tip[0] - size * Math.cos(ang + 0.45), tip[1] - size * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
  }
  function drawLine(ctx, line, color = COLORS.line) {
    const pts = line.pts; if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const ang = endDir(pts), tip = pts[pts.length - 1];
    if (line.type === 'dribble') {
      const rs = resample(pts, 0.05);
      let total = 0; const cum = [0];
      for (let i = 1; i < rs.length; i++) { total += dist(rs[i - 1], rs[i]); cum.push(total); }
      ctx.beginPath();
      for (let i = 0; i < rs.length; i++) {
        const p = rs[i], q = rs[Math.min(i + 1, rs.length - 1)], o = rs[Math.max(i - 1, 0)];
        const a = Math.atan2(q[1] - o[1], q[0] - o[0]);
        const amp = cum[i] < total - 0.55 ? 0.17 * Math.sin(cum[i] * Math.PI * 2 / 0.55) : 0;
        const x = p[0] - Math.sin(a) * amp, y = p[1] + Math.cos(a) * amp;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); arrowHead(ctx, tip, ang);
    } else {
      if (line.type === 'pass') ctx.setLineDash([0.32, 0.22]);
      ctx.beginPath(); smoothPath(ctx, pts); ctx.stroke();
      ctx.setLineDash([]);
      if (line.type === 'screen') {
        const L = 0.45, px = -Math.sin(ang) * L, py = Math.cos(ang) * L;
        ctx.lineWidth = 0.14;
        ctx.beginPath(); ctx.moveTo(tip[0] + px, tip[1] + py); ctx.lineTo(tip[0] - px, tip[1] - py); ctx.stroke();
      } else arrowHead(ctx, tip, ang);
    }
    ctx.restore();
  }

  /* ---------- אובייקטים ---------- */
  function drawObject(ctx, o, p, { alpha = 1, selected = false } = {}) {
    ctx.save(); ctx.globalAlpha = alpha;
    const [x, y] = p;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
    if (selected) {
      ctx.strokeStyle = '#ee6a1f'; ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.arc(x, y, R + 0.22, 0, Math.PI * 2); ctx.stroke();
    }
    if (o.t === 'off') {
      ctx.fillStyle = COLORS.off; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `700 ${R * 1.15}px Assistant, Arial, sans-serif`;
      ctx.fillText(o.n || '', x, y + 0.03);
    } else if (o.t === 'def') {
      const k = R * 0.72;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.32; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k); ctx.moveTo(x + k, y - k); ctx.lineTo(x - k, y + k); ctx.stroke();
      ctx.strokeStyle = COLORS.def; ctx.lineWidth = 0.2;
      ctx.stroke();
      if (o.n) {
        ctx.fillStyle = COLORS.def; ctx.font = `700 ${R * 0.85}px Assistant, Arial, sans-serif`;
        ctx.fillText(o.n, x + R * 1.05, y + R * 0.95);
      }
    } else if (o.t === 'coach') {
      ctx.fillStyle = COLORS.coach;
      ctx.fillRect(x - R, y - R, R * 2, R * 2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.07; ctx.strokeRect(x - R, y - R, R * 2, R * 2);
      ctx.fillStyle = '#fff'; ctx.font = `700 ${R * 1.1}px Assistant, Arial, sans-serif`;
      ctx.fillText(o.n || 'מ', x, y + 0.03);
    } else if (o.t === 'cone') {
      ctx.fillStyle = COLORS.cone; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.06;
      ctx.beginPath(); ctx.moveTo(x, y - 0.42); ctx.lineTo(x + 0.36, y + 0.3); ctx.lineTo(x - 0.36, y + 0.3); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBall(ctx, p, alpha = 1) {
    const r = 0.27;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.ball; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p[0] - r, p[1]); ctx.lineTo(p[0] + r, p[1]);
    ctx.moveTo(p[0], p[1] - r); ctx.lineTo(p[0], p[1] + r);
    ctx.stroke();
    ctx.restore();
  }
  const BALL_OFF = [0.5, -0.45];
  const withOff = p => [p[0] + BALL_OFF[0], p[1] + BALL_OFF[1]];

  /* ---------- תנועה בין שלבים ---------- */
  function pathFor(drill, i, id) {
    const f0 = drill.frames[i], f1 = drill.frames[i + 1];
    const p0 = f0.pos[id], p1 = f1 && f1.pos[id];
    if (!p0) return null;
    if (!p1 || dist(p0, p1) < 0.05) return [p0];
    for (const l of f0.lines || []) {
      if (l.type === 'pass' || l.pts.length < 2) continue;
      if (dist(l.pts[0], p0) < 1.1 && dist(l.pts[l.pts.length - 1], p1) < 1.3) {
        return [p0, ...l.pts.slice(1, -1), p1];
      }
    }
    return [p0, p1];
  }
  function along(path, f) {
    if (path.length === 1) return path[0];
    let total = 0; const seg = [];
    for (let i = 1; i < path.length; i++) { const L = dist(path[i - 1], path[i]); seg.push(L); total += L; }
    let target = total * f;
    for (let i = 0; i < seg.length; i++) {
      if (target <= seg[i] || i === seg.length - 1) return lerp(path[i], path[i + 1], seg[i] ? Math.min(1, target / seg[i]) : 1);
      target -= seg[i];
    }
    return path[path.length - 1];
  }
  function posAt(drill, id, t) {
    const n = drill.frames.length; t = Math.max(0, t);
    const i = Math.min(Math.floor(t), n - 1), f = t - i;
    if (i >= n - 1 || f <= 0) return drill.frames[i].pos[id];
    const path = pathFor(drill, i, id);
    return path ? along(path, ease(f)) : null;
  }
  function ballAt(drill, t) {
    const n = drill.frames.length; t = Math.max(0, t);
    const i = Math.min(Math.floor(t), n - 1), f = t - i;
    const fr = drill.frames[i];
    const ballPos = (b, tt) => {
      if (!b) return null;
      if (b.h) { const p = posAt(drill, b.h, tt); return p ? withOff(p) : null; }
      return b.p;
    };
    if (i >= n - 1 || f <= 0) return ballPos(fr.ball, i);
    const b0 = fr.ball, b1 = drill.frames[i + 1].ball;
    if (!b0 && !b1) return null;
    if (!b0) return f > .5 ? ballPos(b1, t) : null;
    if (!b1) return ballPos(b0, t);
    if (b0.h && b0.h === b1.h) return ballPos(b0, t);
    const a = ballPos(b0, t), b = ballPos(b1, t);
    if (!a || !b) return a || b;
    if (f < .2) return a;
    if (f > .75) return b;
    return lerp(a, b, ease((f - .2) / .55));
  }

  /* ---------- ציור מלא ---------- */
  function render(ctx, W, H, drill, opts = {}) {
    const dpr = opts.dpr || 1;
    const v = fit(drill.court, W, H, opts.pad ?? 14);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = opts.bg || '#3b2a1a'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.ox, dpr * v.oy);
    drawCourt(ctx, drill.court, v.s);
    const n = drill.frames.length;
    const animating = typeof opts.t === 'number';
    const t = Math.max(0, animating ? Math.min(opts.t, n - 1) : Math.min(opts.frame || 0, n - 1));
    const fi = Math.floor(t);
    const frame = drill.frames[fi];
    const objs = drill.objects;

    // רוח רפאים של השלב הקודם (בעריכה)
    if (!animating && opts.ghost && fi > 0) {
      const prev = drill.frames[fi - 1];
      for (const o of objs) {
        const p0 = prev.pos[o.id], p1 = frame.pos[o.id];
        if (!p0) continue;
        drawObject(ctx, o, p0, { alpha: .22 });
        if (p1 && dist(p0, p1) > 0.3) {
          ctx.save(); ctx.strokeStyle = 'rgba(20,33,61,.35)'; ctx.lineWidth = 0.06; ctx.setLineDash([0.12, 0.16]);
          const path = pathFor(drill, fi - 1, o.id) || [p0, p1];
          ctx.beginPath(); smoothPath(ctx, path.length > 1 ? path : [p0, p1]); ctx.stroke(); ctx.restore();
        }
      }
    }
    // קווים
    const lineAlpha = animating && t > fi ? .55 : 1;
    ctx.save(); ctx.globalAlpha = lineAlpha;
    for (const l of frame.lines || []) drawLine(ctx, l, opts.selLine && opts.selLine === l.id ? '#ee6a1f' : COLORS.line);
    ctx.restore();
    if (opts.draft) drawLine(ctx, opts.draft, '#ee6a1f');
    // שחקנים
    for (const o of objs) {
      const p = animating ? posAt(drill, o.id, t) : frame.pos[o.id];
      if (p) drawObject(ctx, o, p, { selected: opts.sel === o.id });
    }
    const bp = animating ? ballAt(drill, t) : ballAt(drill, fi);
    if (bp) drawBall(ctx, bp);
    return v;
  }

  /* תמונה ממוזערת לספרייה */
  function thumbnail(drill, w = 360) {
    const d = dims(drill.court);
    const h = Math.round(w * (d.h + 1) / (d.w + 1));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    render(c.getContext('2d'), w, h, drill, { frame: 0, pad: 8 });
    return c.toDataURL('image/jpeg', .8);
  }

  return { dims, fit, render, thumbnail, posAt, ballAt, dist, R, COLORS };
})();
