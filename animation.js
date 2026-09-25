/* ================================================================
   CONSTANTS
================================================================ */
const C = {
  ink:   '#0E0E0C',
  bone:  '#F0EAD6',
  lime:  '#E8FF00',
  stone: '#8C8A82',
  rgb: { bone: '240,234,214', lime: '232,255,0', stone: '140,138,130' }
};
function rgba(col, a) { return `rgba(${col},${a})`; }
function rand(a, b) { return a + Math.random() * (b - a); }
function rint(a, b) { return Math.floor(rand(a, b)); }

/* ================================================================
   POINTER — works perfectly on mouse AND touch
================================================================ */
class Pointer {
  constructor(el) {
    this.el = el;
    this.x = -9999; this.y = -9999;
    this.px = 0; this.py = 0;
    this.vx = 0; this.vy = 0;
    this.speed = 0;
    this.down = false; this.justDown = false; this.justUp = false;
    this.in = false;
    this.touchId = null;
    this.startX = 0; this.startY = 0;
    this.hasMoved = false;
    this.bind();
  }
  getPos(cx, cy) {
    const r = this.el.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  }
  bind() {
    /* ---------- MOUSE ---------- */
    this.el.addEventListener('mousemove', e => {
      const p = this.getPos(e.clientX, e.clientY);
      this.px = this.x; this.py = this.y;
      this.x = p.x; this.y = p.y;
      this.vx = this.x - this.px; this.vy = this.y - this.py;
      this.speed = Math.hypot(this.vx, this.vy);
      this.in = true;
    });
    this.el.addEventListener('mouseenter', () => { this.in = true; });
    this.el.addEventListener('mouseleave', () => { this.in = false; this.x = -9999; });
    this.el.addEventListener('mousedown', e => {
      const p = this.getPos(e.clientX, e.clientY);
      this.x = p.x; this.y = p.y;
      if (e.button === 0) { this.down = true; this.justDown = true; this.in = true; }
      e.preventDefault();
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) { this.down = false; this.justUp = true; }
    });
    this.el.addEventListener('contextmenu', e => e.preventDefault());

    /* ---------- TOUCH ---------- */
    this.el.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      const p = this.getPos(t.clientX, t.clientY);
      this.x = p.x; this.y = p.y;
      this.px = p.x; this.py = p.y;
      this.startX = p.x; this.startY = p.y;
      this.touchId = t.identifier;
      this.down = true; this.justDown = true; this.in = true;
      this.hasMoved = false;
    }, { passive: true });

    this.el.addEventListener('touchmove', e => {
      const t = Array.from(e.touches).find(tt => tt.identifier === this.touchId);
      if (!t) return;
      const p = this.getPos(t.clientX, t.clientY);
      this.px = this.x; this.py = this.y;
      this.x = p.x; this.y = p.y;
      this.vx = this.x - this.px; this.vy = this.y - this.py;
      this.speed = Math.hypot(this.vx, this.vy);
      this.in = true;
      if (Math.hypot(this.x - this.startX, this.y - this.startY) > 8) {
        this.hasMoved = true;
      }
      if (this.hasMoved) {
        e.preventDefault();
      }
    }, { passive: false });

    this.el.addEventListener('touchend', e => {
      const t = Array.from(e.changedTouches).find(tt => tt.identifier === this.touchId);
      if (t) {
        this.down = false; this.justUp = true;
        this.touchId = null;
      }
    }, { passive: true });

    this.el.addEventListener('touchcancel', () => {
      this.down = false; this.justUp = true;
      this.touchId = null;
    });
  }
  endFrame() { this.justDown = false; this.justUp = false; }
  reset() { this.down = false; this.justDown = false; this.justUp = false; }
}

/* ================================================================
   01 · ASTEROID BLASTER — GAME
================================================================ */
function animAsteroidBlaster() {
  let score = 0;
  const asteroids = [];
  const bullets = [];
  const explosions = [];
  const stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: Math.random(), y: Math.random(), z: rand(.3, 1), s: rand(.4, 1.6) });
  let spawnAcc = 0;
  let hitFlash = 0;

  function spawnAsteroid(W, H) {
    const side = rint(0, 4);
    let x, y;
    if (side === 0) { x = rand(0, W); y = -30; }
    else if (side === 1) { x = W + 30; y = rand(0, H); }
    else if (side === 2) { x = rand(0, W); y = H + 30; }
    else { x = -30; y = rand(0, H); }
    const tx = W / 2 + rand(-80, 80);
    const ty = H / 2 + rand(-80, 80);
    const ang = Math.atan2(ty - y, tx - x);
    const sp = rand(0.5, 1.8);
    const verts = [];
    const n = 8 + rint(0, 4);
    const baseR = rand(14, 34);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28;
      const r = baseR * rand(0.7, 1.2);
      verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    asteroids.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      r: baseR, verts, rot: 0, rotSp: rand(-0.03, 0.03),
      hp: Math.ceil(baseR / 15)
    });
  }

  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.4)';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      const a = 0.3 + Math.sin(t * 2 + s.x * 20) * 0.2;
      ctx.fillStyle = rgba(C.rgb.bone, a * s.z);
      ctx.fillRect(s.x * W, s.y * H, s.s * s.z, s.s * s.z);
    }
    spawnAcc += dt;
    const spawnInterval = Math.max(0.4, 1.4 - score * 0.03);
    if (spawnAcc > spawnInterval && asteroids.length < 18) {
      spawnAsteroid(W, H); spawnAcc = 0;
    }
    if (p.justDown && p.in) {
      bullets.push({ x: W / 2, y: H, vx: (p.x - W / 2) * 0.006, vy: (p.y - H) * 0.006 });
      hitFlash = 0.3;
    }
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x += a.vx; a.y += a.vy; a.rot += a.rotSp;
      ctx.save();
      ctx.translate(a.x, a.y); ctx.rotate(a.rot);
      ctx.beginPath();
      ctx.moveTo(a.verts[0][0], a.verts[0][1]);
      for (let k = 1; k < a.verts.length; k++) ctx.lineTo(a.verts[k][0], a.verts[k][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(60,60,55,0.6)';
      ctx.fill();
      ctx.strokeStyle = rgba(C.rgb.bone, 0.7);
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + 4) {
          bullets.splice(j, 1);
          a.hp--;
          if (a.hp <= 0) {
            score++;
            for (let k = 0; k < 18; k++) {
              const ang = Math.random() * 6.28;
              const sp = rand(1, 5);
              explosions.push({ x: a.x, y: a.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, size: rand(1, 3) });
            }
            asteroids.splice(i, 1);
            break;
          }
        }
      }
      if (a.x < -80 || a.x > W + 80 || a.y < -80 || a.y > H + 80) asteroids.splice(i, 1);
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * 60 * dt; b.y += b.vy * 60 * dt;
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) { bullets.splice(i, 1); continue; }
      ctx.fillStyle = C.lime;
      ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
    }
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.x += e.vx; e.y += e.vy;
      e.vx *= 0.95; e.vy *= 0.95;
      e.life -= dt * 1.6;
      if (e.life <= 0) { explosions.splice(i, 1); continue; }
      ctx.fillStyle = rgba(C.rgb.lime, e.life);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * e.life, 0, 6.28); ctx.fill();
    }
    if (p.in) {
      const r = 26 + Math.sin(t * 6) * 3;
      ctx.strokeStyle = C.lime; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.28); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * 6.28 + t * 0.8;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2, 0, 6.28);
        ctx.fillStyle = C.lime; ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(p.x - 8, p.y); ctx.lineTo(p.x + 8, p.y);
      ctx.moveTo(p.x, p.y - 8); ctx.lineTo(p.x, p.y + 8);
      ctx.stroke();
    }
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.textAlign = 'left'; ctx.fillStyle = C.lime;
    ctx.fillText('SCORE · ' + score, 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('TAP TO FIRE', 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText('ASTEROIDS: ' + asteroids.length, W - 20, 30);
    if (hitFlash > 0) {
      ctx.fillStyle = rgba(C.rgb.lime, hitFlash * 0.4);
      ctx.fillRect(0, 0, W, H); hitFlash -= dt * 3;
    }
  };
}

/* ================================================================
   02 · CIRCUIT GRID — GAME (TECH)
================================================================ */
function animCircuit() {
  const COLS = 7, ROWS = 5;
  let nodes = [];
  let wires = [];
  let dragFrom = null;
  let dragTo = null;
  let score = 0;
  let flash = 0;

  function init() {
    nodes = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      nodes.push({ x, y, type: 'plain', lit: false });
    }
    nodes[2 * COLS + 0].type = 'power';
    nodes[1 * COLS + COLS - 1].type = 'target';
    nodes[3 * COLS + COLS - 1].type = 'target';
    wires = [];
  }
  init();

  function layout(W, H) {
    const pad = Math.max(40, Math.min(W, H) * 0.13);
    return { padX: pad, padY: pad, cellW: (W - pad * 2) / (COLS - 1), cellH: (H - pad * 2) / (ROWS - 1) };
  }
  function screenPos(n, W, H) {
    const L = layout(W, H);
    return { x: L.padX + n.x * L.cellW, y: L.padY + n.y * L.cellH };
  }

  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.4)';
    ctx.fillRect(0, 0, W, H);

    const L = layout(W, H);

    ctx.strokeStyle = rgba(C.rgb.stone, 0.08);
    ctx.lineWidth = 0.5;
    for (let x = 0; x < COLS; x++) {
      ctx.beginPath(); ctx.moveTo(L.padX + x * L.cellW, L.padY);
      ctx.lineTo(L.padX + x * L.cellW, L.padY + (ROWS - 1) * L.cellH); ctx.stroke();
    }
    for (let y = 0; y < ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(L.padX, L.padY + y * L.cellH);
      ctx.lineTo(L.padX + (COLS - 1) * L.cellW, L.padY + y * L.cellH); ctx.stroke();
    }

    let hovered = null;
    if (p.in) {
      for (const n of nodes) {
        const pos = screenPos(n, W, H);
        if (Math.hypot(p.x - pos.x, p.y - pos.y) < 26) { hovered = n; break; }
      }
    }

    if (p.justDown && hovered) { dragFrom = hovered; dragTo = { x: p.x, y: p.y }; }
    if (p.down && dragFrom && p.in) dragTo = { x: p.x, y: p.y };
    if (p.justUp) {
      if (dragFrom && hovered && hovered !== dragFrom) {
        const exists = wires.find(w =>
          (w.a === dragFrom && w.b === hovered) || (w.a === hovered && w.b === dragFrom));
        if (!exists) wires.push({ a: dragFrom, b: hovered, phase: Math.random() });
      }
      dragFrom = null; dragTo = null;
    }

    const litSet = new Set();
    const power = nodes.find(n => n.type === 'power');
    if (power) {
      const q = [power]; litSet.add(power);
      while (q.length) {
        const cur = q.shift();
        for (const w of wires) {
          const other = w.a === cur ? w.b : (w.b === cur ? w.a : null);
          if (other && !litSet.has(other)) { litSet.add(other); q.push(other); }
        }
      }
    }

    let allLit = true;
    for (const n of nodes) {
      if (n.type === 'target') {
        const wasLit = n.lit;
        n.lit = litSet.has(n);
        if (n.lit && !wasLit) score += 25;
        if (!n.lit) allLit = false;
      }
    }
    if (allLit && wires.length > 0 && flash <= 0) { flash = 1; score += 100; }
    if (flash > 0) {
      flash -= dt * 1.5;
      if (flash < 0.05) { flash = 0; wires = []; }
    }

    for (const w of wires) {
      const a = screenPos(w.a, W, H);
      const b = screenPos(w.b, W, H);
      const lit = litSet.has(w.a) && litSet.has(w.b);
      ctx.strokeStyle = lit ? rgba(C.rgb.lime, 0.9) : rgba(C.rgb.stone, 0.5);
      ctx.lineWidth = lit ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (lit) {
        const prog = ((t * 0.8 + w.phase) % 1);
        const px = a.x + (b.x - a.x) * prog;
        const py = a.y + (b.y - a.y) * prog;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 8);
        g.addColorStop(0, rgba(C.rgb.lime, 0.9));
        g.addColorStop(1, rgba(C.rgb.lime, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, 8, 0, 6.28); ctx.fill();
      }
    }

    if (dragFrom && dragTo) {
      const a = screenPos(dragFrom, W, H);
      ctx.strokeStyle = rgba(C.rgb.lime, 0.7);
      ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(dragTo.x, dragTo.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const n of nodes) {
      const pos = screenPos(n, W, H);
      const lit = litSet.has(n);
      const isHover = hovered === n;
      const isDrag = dragFrom === n;

      if (n.type === 'power') {
        const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 30);
        g.addColorStop(0, rgba(C.rgb.lime, 0.5 + Math.sin(t * 3) * 0.15));
        g.addColorStop(1, rgba(C.rgb.lime, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 30, 0, 6.28); ctx.fill();
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 12, 0, 6.28);
        ctx.fillStyle = C.lime; ctx.fill();
        ctx.strokeStyle = C.bone; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.font = 'bold 14px JetBrains Mono, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', pos.x, pos.y);
      } else if (n.type === 'target') {
        const c = n.lit ? C.lime : rgba(C.rgb.stone, 0.6);
        if (n.lit) {
          const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 40);
          g.addColorStop(0, rgba(C.rgb.lime, 0.6));
          g.addColorStop(1, rgba(C.rgb.lime, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 40, 0, 6.28); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 12, 0, 6.28);
        ctx.strokeStyle = c; ctx.lineWidth = n.lit ? 3 : 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 5, 0, 6.28);
        ctx.fillStyle = c; ctx.fill();
      } else {
        const sz = isHover || isDrag ? 8 : 6;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, sz, 0, 6.28);
        ctx.fillStyle = lit ? rgba(C.rgb.lime, 0.7) : rgba(C.rgb.bone, 0.15);
        ctx.fill();
        ctx.strokeStyle = lit ? C.lime : (isHover ? C.lime : rgba(C.rgb.bone, 0.4));
        ctx.lineWidth = lit ? 2 : 1.5; ctx.stroke();
      }
    }

    if (flash > 0) {
      ctx.fillStyle = rgba(C.rgb.lime, flash * 0.15);
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.lime;
      ctx.font = 'bold 28px JetBrains Mono, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CIRCUIT COMPLETE', W / 2, H / 2);
    }

    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.lime;
    ctx.fillText('CIRCUIT · LAB', 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('DRAG NODES TO CONNECT · LIGHT UP TARGETS', 20, 50);
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillStyle = C.lime;
    ctx.fillText('SCORE ' + score, W - 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('WIRES: ' + wires.length, W - 20, 50);
  };
}

/* ================================================================
   03 · FUSION REACTOR — SIM (SCIENCE)
================================================================ */
function animReactor() {
  const plasma = [];
  let temp = 0;
  for (let i = 0; i < 250; i++) {
    plasma.push({
      a: Math.random() * 6.28,
      r: 0.35 + Math.random() * 0.55,
      speed: 0.5 + Math.random() * 1.2,
      size: 1 + Math.random() * 1.5,
      col: Math.random() < 0.6 ? 'lime' : 'bone'
    });
  }
  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.15)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.36;

    for (let i = 0; i < 4; i++) {
      const rr = R * (0.4 + i * 0.18);
      ctx.strokeStyle = rgba(C.rgb.stone, 0.12 - i * 0.02);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rr, rr * 0.6, 0, 0, 6.28);
      ctx.stroke();
    }

    const heating = p.down;
    if (heating) temp = Math.min(1, temp + dt * 0.35);
    else temp = Math.max(0, temp - dt * 0.08);

    const boost = 1 + temp * 2.5;

    for (const q of plasma) {
      q.a += q.speed * dt * boost * 0.6;
      const radius = R * q.r;
      const x = cx + Math.cos(q.a) * radius;
      const y = cy + Math.sin(q.a) * radius * 0.6;

      const energy = q.speed * (1 + temp);
      const isHot = energy > 1.5;
      const col = isHot ? C.rgb.lime : C.rgb.bone;
      const alpha = 0.3 + Math.min(0.7, energy * 0.15);

      if (isHot) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
        g.addColorStop(0, rgba(C.rgb.lime, 0.6));
        g.addColorStop(1, rgba(C.rgb.lime, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.28); ctx.fill();
      }
      ctx.fillStyle = rgba(col, alpha);
      ctx.beginPath(); ctx.arc(x, y, q.size, 0, 6.28); ctx.fill();
    }

    const heat = temp;
    if (heat > 0.05) {
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.6);
      cg.addColorStop(0, rgba(C.rgb.lime, heat * 0.7));
      cg.addColorStop(0.5, rgba(C.rgb.lime, heat * 0.2));
      cg.addColorStop(1, rgba(C.rgb.lime, 0));
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, 6.28); ctx.fill();
    }

    if (p.justDown && p.in) {
      for (let i = 0; i < 25; i++) {
        plasma.push({
          a: Math.random() * 6.28,
          r: 0.35 + Math.random() * 0.55,
          speed: 1 + Math.random() * 2,
          size: 1 + Math.random() * 1.5,
          col: 'lime'
        });
      }
      if (plasma.length > 900) plasma.splice(0, 100);
    }

    if (p.in) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 120);
      g.addColorStop(0, rgba(C.rgb.lime, 0.08));
      g.addColorStop(1, rgba(C.rgb.lime, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 120, 0, 6.28); ctx.fill();
    }

    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.lime;
    ctx.fillText('FUSION REACTOR', 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('TAP TO INJECT · HOLD TO HEAT', 20, 50);
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillStyle = temp > 0.7 ? C.lime : C.bone;
    ctx.fillText('TEMP · ' + Math.round(temp * 100) + '%', W - 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('PLASMA · ' + plasma.length, W - 20, 50);
  };
}

/* ================================================================
   04 · WARP DRIVE — SIM
================================================================ */
function animWarpDrive() {
  const stars = [];
  for (let i = 0; i < 900; i++) stars.push({ x: rand(-1, 1), y: rand(-1, 1), z: Math.random() });
  let boost = 1;
  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.3)';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const maxDim = Math.max(W, H);
    const targetBoost = p.down ? 3.5 : (p.in && p.speed > 8 ? 1.8 : 1);
    boost += (targetBoost - boost) * 0.08;
    const baseSpeed = 0.004 * boost;
    for (const s of stars) {
      s.z -= baseSpeed;
      if (s.z <= 0.02) { s.x = rand(-1, 1); s.y = rand(-1, 1); s.z = 1; }
      const px = s.x / s.z * maxDim * 0.6;
      const py = s.y / s.z * maxDim * 0.6;
      const prevX = s.x / (s.z + baseSpeed) * maxDim * 0.6;
      const prevY = s.y / (s.z + baseSpeed) * maxDim * 0.6;
      const x1 = cx + px, y1 = cy + py;
      const x2 = cx + prevX, y2 = cy + prevY;
      if (x1 < -50 || x1 > W + 50 || y1 < -50 || y1 > H + 50) continue;
      const depth = 1 - s.z;
      const col = boost > 2 ? C.rgb.lime : C.rgb.bone;
      ctx.strokeStyle = rgba(col, depth * 0.9);
      ctx.lineWidth = 0.5 + depth * 2;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    g.addColorStop(0, rgba(C.rgb.lime, boost > 2 ? 0.4 : 0.1));
    g.addColorStop(1, rgba(C.rgb.lime, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 120, 0, 6.28); ctx.fill();
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('HOLD TO WARP', 20, 30);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.lime;
    ctx.fillText('WARP × ' + boost.toFixed(2), W - 20, 30);
  };
}

/* ================================================================
   05 · LASER GRID — GAME (TECH)
================================================================ */
function animLaser() {
  const COLS = 9, ROWS = 6;
  let grid = [];
  let score = 0;
  let level = 1;
  let wonTimer = 0;
  let justWon = false;

  function initLevel() {
    grid = new Array(COLS * ROWS).fill(0);
    const count = 2 + Math.min(level, 4);
    const used = new Set();
    for (let i = 0; i < count; i++) {
      let x, y, k;
      let tries = 0;
      do {
        x = 1 + rint(0, COLS - 2);
        y = rint(0, ROWS);
        k = y * COLS + x;
        tries++;
      } while (used.has(k) && tries < 20);
      used.add(k);
      grid[k] = 1 + rint(0, 2);
    }
    wonTimer = 0;
    justWon = false;
  }
  initLevel();

  function getCell(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return -1;
    return grid[y * COLS + x];
  }

  const emitterY = Math.floor(ROWS / 2);
  const targetY = emitterY;

  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);

    const pad = Math.max(40, Math.min(W, H) * 0.1);
    const gridW = W - pad * 2 - 60;
    const gridH = H - pad * 2;
    const cellW = gridW / COLS;
    const cellH = gridH / ROWS;

    const cellCenter = (x, y) => ({ x: pad + (x + 0.5) * cellW, y: pad + (y + 0.5) * cellH });
    const gridFromScreen = (px, py) => ({
      x: Math.floor((px - pad) / cellW),
      y: Math.floor((py - pad) / cellH)
    });

    let lx = -1, ly = emitterY;
    let dx = 1, dy = 0;
    const rayPoints = [cellCenter(-1, emitterY)];
    const visited = new Set();
    let hitTarget = false;

    for (let step = 0; step < 300; step++) {
      const key = lx + ',' + ly + ',' + dx + ',' + dy;
      if (visited.has(key)) break;
      visited.add(key);
      lx += dx; ly += dy;
      if (lx === COLS && ly === targetY) {
        hitTarget = true;
        rayPoints.push({ x: pad + COLS * cellW + 30, y: pad + (targetY + 0.5) * cellH });
        break;
      }
      if (lx < 0 || lx >= COLS || ly < 0 || ly >= ROWS) {
        rayPoints.push(cellCenter(lx, ly));
        break;
      }
      const cell = getCell(lx, ly);
      if (cell === 1) { const ndx = -dy, ndy = -dx; dx = ndx; dy = ndy; }
      else if (cell === 2) { const ndx = dy, ndy = dx; dx = ndx; dy = ndy; }
      rayPoints.push(cellCenter(lx, ly));
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const gx = pad + x * cellW;
        const gy = pad + y * cellH;
        ctx.strokeStyle = rgba(C.rgb.stone, 0.12);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(gx, gy, cellW, cellH);
        const cell = getCell(x, y);
        if (cell === 1) {
          ctx.strokeStyle = C.lime;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(gx + cellW * 0.25, gy + cellH * 0.75);
          ctx.lineTo(gx + cellW * 0.75, gy + cellH * 0.25);
          ctx.stroke();
        } else if (cell === 2) {
          ctx.strokeStyle = C.lime;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(gx + cellW * 0.25, gy + cellH * 0.25);
          ctx.lineTo(gx + cellW * 0.75, gy + cellH * 0.75);
          ctx.stroke();
        }
        if (p.in) {
          const cx2 = gx + cellW * 0.5, cy2 = gy + cellH * 0.5;
          if (Math.hypot(p.x - cx2, p.y - cy2) < cellW * 0.5) {
            ctx.fillStyle = rgba(C.rgb.lime, 0.06);
            ctx.fillRect(gx, gy, cellW, cellH);
          }
        }
      }
    }

    const ex = pad - 30;
    const ey = pad + (emitterY + 0.5) * cellH;
    ctx.fillStyle = C.lime;
    ctx.beginPath(); ctx.arc(ex, ey, 8, 0, 6.28); ctx.fill();
    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 20);
    eg.addColorStop(0, rgba(C.rgb.lime, 0.5));
    eg.addColorStop(1, rgba(C.rgb.lime, 0));
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(ex, ey, 20, 0, 6.28); ctx.fill();

    const tx = pad + COLS * cellW + 30;
    const ty = pad + (targetY + 0.5) * cellH;
    ctx.strokeStyle = hitTarget ? C.lime : rgba(C.rgb.stone, 0.6);
    ctx.lineWidth = hitTarget ? 3 : 2;
    ctx.beginPath(); ctx.arc(tx, ty, 12, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.arc(tx, ty, 5, 0, 6.28);
    ctx.fillStyle = hitTarget ? C.lime : rgba(C.rgb.stone, 0.6);
    ctx.fill();
    if (hitTarget) {
      const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 32);
      tg.addColorStop(0, rgba(C.rgb.lime, 0.5));
      tg.addColorStop(1, rgba(C.rgb.lime, 0));
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(tx, ty, 32, 0, 6.28); ctx.fill();
    }

    for (let i = 0; i < rayPoints.length - 1; i++) {
      const a = rayPoints[i];
      const b = rayPoints[i + 1];
      ctx.strokeStyle = rgba(C.rgb.lime, 0.3);
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = C.lime;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const prog = (t * 0.8) % 1;
      const px = a.x + (b.x - a.x) * prog;
      const py = a.y + (b.y - a.y) * prog;
      ctx.fillStyle = C.bone;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, 6.28); ctx.fill();
    }

    if (p.justDown && p.in) {
      const g = gridFromScreen(p.x, p.y);
      if (g.x >= 0 && g.x < COLS && g.y >= 0 && g.y < ROWS) {
        const idx = g.y * COLS + g.x;
        grid[idx] = (grid[idx] + 1) % 3;
      }
    }

    if (hitTarget && !justWon) { justWon = true; wonTimer = 1.2; score += 100; }
    if (wonTimer > 0) {
      wonTimer -= dt;
      ctx.fillStyle = rgba(C.rgb.lime, 0.15 * (wonTimer / 1.2));
      ctx.fillRect(0, 0, W, H);
      if (wonTimer <= 0) { level++; initLevel(); }
    }

    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.lime;
    ctx.fillText('LASER GRID · LV ' + level, 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('TAP CELLS TO ROTATE MIRRORS', 20, 50);
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillStyle = C.lime;
    ctx.fillText('SCORE ' + score, W - 20, 30);
  };
}

/* ================================================================
   06 · NEBULA PAINTER — PLAY
================================================================ */
function animNebulaPainter() {
  const strokes = [];
  const stars = [];
  for (let i = 0; i < 200; i++) stars.push({ x: Math.random(), y: Math.random(), s: rand(.3, 2), a: Math.random() * 6.28 });
  let hue = 60;
  let lastX = 0, lastY = 0, hasLast = false;

  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.06)';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      const a = 0.3 + Math.sin(t * 2 + s.a) * 0.25;
      ctx.fillStyle = rgba(C.rgb.bone, a);
      ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    if (p.down && p.in) {
      if (hasLast) {
        const dist = Math.hypot(p.x - lastX, p.y - lastY);
        if (dist > 3) {
          strokes.push({ x1: lastX, y1: lastY, x2: p.x, y2: p.y, life: 1, hue, size: 20 + Math.random() * 40 });
        }
      }
      lastX = p.x; lastY = p.y; hasLast = true;
      hue += 0.5;
    } else hasLast = false;

    ctx.globalCompositeOperation = 'lighter';
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      s.life -= dt * 0.05;
      if (s.life <= 0) { strokes.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(s.x2, s.y2, 0, s.x2, s.y2, s.size);
      const col = `hsla(${s.hue},80%,60%,`;
      g.addColorStop(0, col + (s.life * 0.35) + ')');
      g.addColorStop(0.5, col + (s.life * 0.15) + ')');
      g.addColorStop(1, col + '0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x2, s.y2, s.size, 0, 6.28); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    if (p.in) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40);
      g.addColorStop(0, rgba(C.rgb.lime, 0.3));
      g.addColorStop(1, rgba(C.rgb.lime, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, 6.28); ctx.fill();
    }
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('DRAG TO PAINT NEBULA', 20, 30);
    ctx.textAlign = 'right';
    ctx.fillText('LAYERS: ' + strokes.length, W - 20, 30);
  };
}

/* ================================================================
   07 · FIREWALL DEFENDER — GAME (TECH)
================================================================ */
function animFirewall() {
  const packets = [];
  const explosions = [];
  const LANES = 6;
  let score = 0;
  let health = 100;
  let spawnAcc = 0;
  let combo = 0;
  let comboTimer = 0;
  let damageFlash = 0;

  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.3)';
    ctx.fillRect(0, 0, W, H);

    const laneH = H / LANES;
    const firewallX = W - 80;

    ctx.strokeStyle = rgba(C.rgb.lime, 0.3);
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(firewallX, 0); ctx.lineTo(firewallX, H); ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 1; i < LANES; i++) {
      ctx.strokeStyle = rgba(C.rgb.stone, 0.08);
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, i * laneH); ctx.lineTo(W, i * laneH); ctx.stroke();
    }

    spawnAcc += dt;
    if (spawnAcc > 0.4) {
      spawnAcc = 0;
      const lane = rint(0, LANES);
      const isVirus = Math.random() < 0.6;
      packets.push({
        x: -30,
        y: laneH * (lane + 0.5),
        lane, isVirus,
        speed: 120 + Math.random() * 80,
        size: 10
      });
    }

    for (let i = packets.length - 1; i >= 0; i--) {
      const q = packets[i];
      q.x += q.speed * dt;

      if (p.justDown && p.in && Math.hypot(p.x - q.x, p.y - q.y) < q.size + 14) {
        if (q.isVirus) {
          score += 10 * (1 + combo);
          combo++; comboTimer = 1.5;
          for (let k = 0; k < 12; k++) {
            const a = Math.random() * 6.28;
            const sp = rand(1, 3);
            explosions.push({ x: q.x, y: q.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, size: rand(2, 4) });
          }
        } else {
          score = Math.max(0, score - 8);
          combo = 0;
        }
        packets.splice(i, 1);
        continue;
      }

      if (q.x > firewallX) {
        if (q.isVirus) { health -= 12; combo = 0; damageFlash = 0.4; }
        else score += 2;
        packets.splice(i, 1);
        continue;
      }

      const colRgb = q.isVirus ? '255,68,68' : C.rgb.lime;
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size * 3);
      g.addColorStop(0, `rgba(${colRgb},0.5)`);
      g.addColorStop(1, `rgba(${colRgb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size * 3, 0, 6.28); ctx.fill();

      ctx.fillStyle = q.isVirus ? '#FF4444' : C.lime;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 6.28); ctx.fill();

      if (q.isVirus) {
        ctx.strokeStyle = C.bone;
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * 6.28 + t * 3;
          ctx.beginPath();
          ctx.moveTo(q.x + Math.cos(a) * q.size * 0.5, q.y + Math.sin(a) * q.size * 0.5);
          ctx.lineTo(q.x + Math.cos(a) * q.size * 1.3, q.y + Math.sin(a) * q.size * 1.3);
          ctx.stroke();
        }
      }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.x += e.vx; e.y += e.vy;
      e.vx *= 0.95; e.vy *= 0.95;
      e.life -= dt * 1.8;
      if (e.life <= 0) { explosions.splice(i, 1); continue; }
      ctx.fillStyle = rgba(C.rgb.lime, e.life);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.size * e.life, 0, 6.28); ctx.fill();
    }

    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }

    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('FIREWALL', 20, 24);
    ctx.fillStyle = rgba(C.rgb.stone, 0.3);
    ctx.fillRect(90, 16, 160, 8);
    ctx.fillStyle = health > 40 ? C.lime : '#FF4444';
    ctx.fillRect(90, 16, 160 * (health / 100), 8);

    ctx.textAlign = 'right';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillStyle = C.lime;
    ctx.fillText('SCORE · ' + score, W - 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('TAP RED VIRUSES · LET GREEN PASS', W - 20, 50);

    if (combo > 1) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px JetBrains Mono, monospace';
      ctx.fillStyle = C.lime;
      ctx.fillText('×' + combo, W / 2, 40);
    }

    if (damageFlash > 0) {
      ctx.fillStyle = `rgba(255,50,50,${damageFlash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
      damageFlash -= dt * 3;
    }

    if (health <= 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF4444';
      ctx.font = 'bold 32px JetBrains Mono, monospace';
      ctx.fillText('SYSTEM BREACHED', W / 2, H / 2 - 20);
      ctx.fillStyle = C.lime;
      ctx.font = '16px JetBrains Mono, monospace';
      ctx.fillText('FINAL SCORE: ' + score, W / 2, H / 2 + 20);
      ctx.fillStyle = rgba(C.rgb.stone, 0.8);
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('TAP TO REBOOT', W / 2, H / 2 + 60);
      if (p.justDown) { health = 100; score = 0; packets.length = 0; combo = 0; }
    }
  };
}

/* ================================================================
   08 · COSMIC LENS — SIM
================================================================ */
function animCosmicLens() {
  const stars = [];
  for (let i = 0; i < 300; i++) stars.push({ x: rand(-1, 1), y: rand(-1, 1), s: rand(.5, 2) });
  let strength = 1;
  let targetStrength = 1;

  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.35)';
    ctx.fillRect(0, 0, W, H);
    if (p.down) targetStrength = 3;
    else if (p.in && p.speed > 5) targetStrength = 1.8;
    else targetStrength = 1;
    strength += (targetStrength - strength) * 0.08;
    const cx = p.in ? p.x : W / 2;
    const cy = p.in ? p.y : H / 2;
    const lensR = Math.min(W, H) * 0.5;

    function warp(x, y) {
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy) + 0.001;
      if (d < lensR) {
        const pull = (1 - d / lensR) * 80 * strength;
        return { x: x - (dx / d) * pull, y: y - (dy / d) * pull };
      }
      return { x, y };
    }

    const gridStep = 40;
    ctx.strokeStyle = rgba(C.rgb.stone, 0.15);
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= W; gx += gridStep) {
      ctx.beginPath();
      for (let gy = 0; gy <= H; gy += 12) {
        const w = warp(gx, gy);
        if (gy === 0) ctx.moveTo(w.x, w.y); else ctx.lineTo(w.x, w.y);
      }
      ctx.stroke();
    }
    for (let gy = 0; gy <= H; gy += gridStep) {
      ctx.beginPath();
      for (let gx = 0; gx <= W; gx += 12) {
        const w = warp(gx, gy);
        if (gx === 0) ctx.moveTo(w.x, w.y); else ctx.lineTo(w.x, w.y);
      }
      ctx.stroke();
    }

    for (const s of stars) {
      const x = (s.x * 0.5 + 0.5) * W;
      const y = (s.y * 0.5 + 0.5) * H;
      const w = warp(x, y);
      const dist = Math.hypot(x - cx, y - cy);
      const mag = dist < lensR ? 1 + (1 - dist / lensR) * strength * 1.5 : 1;
      const tw = 0.5 + Math.sin(t * 2 + s.x * 20) * 0.5;
      ctx.fillStyle = rgba(C.rgb.bone, tw * 0.8);
      ctx.beginPath(); ctx.arc(w.x, w.y, s.s * mag, 0, 6.28); ctx.fill();
    }

    if (p.in) {
      for (let i = 0; i < 3; i++) {
        const r = lensR * (0.3 + i * 0.25);
        ctx.strokeStyle = rgba(C.rgb.lime, 0.15 / (i + 1) * strength);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.28); ctx.stroke();
      }
    }
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('MOVE TO BEND SPACETIME · HOLD FOR MAX', 20, 30);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.lime;
    ctx.fillText('LENS × ' + strength.toFixed(2), W - 20, 30);
  };
}

/* ================================================================
   09 · QUANTUM LAB — SIM (SCIENCE)
================================================================ */
function animQuantum() {
  const particles = [];
  const N = 280;
  for (let i = 0; i < N; i++) {
    particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      phase: Math.random() * 6.28,
      collapsed: false,
      collapseTime: 0,
      isEntangled: Math.random() < 0.15,
      twin: null
    });
  }
  for (let i = 0; i < particles.length; i++) {
    if (particles[i].isEntangled && !particles[i].twin) {
      for (let j = i + 1; j < particles.length; j++) {
        if (particles[j].isEntangled && !particles[j].twin) {
          particles[i].twin = particles[j];
          particles[j].twin = particles[i];
          break;
        }
      }
    }
  }

  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.15)';
    ctx.fillRect(0, 0, W, H);
    const mouseR = Math.min(W, H) * 0.35;

    let collapsedCount = 0;

    for (const q of particles) {
      const px = q.x * W;
      const py = q.y * H;
      const distToMouse = Math.hypot(px - p.x, py - p.y);
      const observed = p.in && distToMouse < mouseR;

      if (observed && !q.collapsed) {
        q.collapsed = true;
        q.collapseTime = 0;
        if (q.twin && !q.twin.collapsed) {
          q.twin.collapsed = true;
          q.twin.collapseTime = 0;
        }
      } else if (!observed && q.collapsed) {
        q.collapseTime += dt;
        if (q.collapseTime > 0.8 && (!q.twin || q.twin.collapseTime > 0.8)) {
          q.collapsed = false;
        }
      }

      if (q.collapsed) {
        collapsedCount++;
        q.collapseTime += dt;
        const size = Math.max(1, 3 - q.collapseTime * 2);
        const col = q.isEntangled ? C.bone : C.lime;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(px, py, size, 0, 6.28); ctx.fill();

        if (q.collapseTime < 0.2) {
          const g = ctx.createRadialGradient(px, py, 0, px, py, 30);
          const alpha = (0.2 - q.collapseTime) * 5;
          g.addColorStop(0, rgba(C.rgb.lime, alpha));
          g.addColorStop(1, rgba(C.rgb.lime, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(px, py, 30, 0, 6.28); ctx.fill();
        }
      } else {
        q.phase += dt * 2;
        q.x += q.vx; q.y += q.vy;
        if (q.x < 0) q.x += 1; if (q.x > 1) q.x -= 1;
        if (q.y < 0) q.y += 1; if (q.y > 1) q.y -= 1;
        const spread = 8 + Math.sin(q.phase) * 4;
        const col = q.isEntangled ? C.rgb.bone : C.rgb.lime;
        const g = ctx.createRadialGradient(px, py, 0, px, py, spread);
        g.addColorStop(0, rgba(col, 0.35));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, spread, 0, 6.28); ctx.fill();
      }
    }

    if (p.in) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, mouseR);
      g.addColorStop(0, rgba(C.rgb.lime, 0.05));
      g.addColorStop(1, rgba(C.rgb.lime, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, mouseR, 0, 6.28); ctx.fill();

      ctx.strokeStyle = rgba(C.rgb.lime, 0.3);
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(p.x, p.y, mouseR, 0, 6.28); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.lime;
    ctx.fillText('QUANTUM LAB', 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('MOVE TO OBSERVE · PARTICLES COLLAPSE', 20, 50);
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillStyle = C.lime;
    ctx.fillText('COLLAPSED · ' + collapsedCount, W - 20, 30);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('SUPERPOSED · ' + (N - collapsedCount), W - 20, 50);
  };
}

/* ================================================================
   10 · GALACTIC COLLISION — SIM
================================================================ */
function animGalacticCollision() {
  const galaxyA = { x: 0.3, y: 0.5, vx: 0.04, vy: 0, stars: [] };
  const galaxyB = { x: 0.7, y: 0.5, vx: -0.04, vy: 0, stars: [] };
  let collisionFlash = 0;
  let mergeTimer = 0;
  const sparks = [];
  let dragging = null;

  function buildGalaxy(g, count, hue) {
    g.stars.length = 0;
    for (let i = 0; i < count; i++) {
      const arm = i % 3;
      const dist = Math.pow(Math.random(), 0.6);
      const ang = dist * 7 + (arm / 3) * 6.28 + Math.random() * 0.3;
      g.stars.push({
        a: ang, r: dist,
        jitter: (Math.random() - 0.5) * 0.15 * dist,
        size: 0.5 + Math.random() * 1.5,
        hue
      });
    }
  }
  buildGalaxy(galaxyA, 500, 'bone');
  buildGalaxy(galaxyB, 500, 'lime');

  return (ctx, W, H, t, dt, p) => {
    ctx.fillStyle = 'rgba(14,14,12,0.15)';
    ctx.fillRect(0, 0, W, H);
    const ax = galaxyA.x * W, ay = galaxyA.y * H;
    const bx = galaxyB.x * W, by = galaxyB.y * H;

    if (p.justDown && p.in) {
      const dA = Math.hypot(p.x - ax, p.y - ay);
      const dB = Math.hypot(p.x - bx, p.y - by);
      if (dA < 120) dragging = galaxyA;
      else if (dB < 120) dragging = galaxyB;
    }
    if (p.justUp) dragging = null;
    if (dragging && p.in) {
      dragging.x += (p.x / W - dragging.x) * 0.15;
      dragging.y += (p.y / H - dragging.y) * 0.15;
    } else {
      galaxyA.x += galaxyA.vx * dt;
      galaxyA.y += galaxyA.vy * dt;
      galaxyB.x += galaxyB.vx * dt;
      galaxyB.y += galaxyB.vy * dt;
    }
    [galaxyA, galaxyB].forEach(g => {
      if (g.x < 0.05) { g.x = 0.05; g.vx *= -1; }
      if (g.x > 0.95) { g.x = 0.95; g.vx *= -1; }
      if (g.y < 0.1) { g.y = 0.1; g.vy *= -1; }
      if (g.y > 0.9) { g.y = 0.9; g.vy *= -1; }
    });

    function drawGalaxy(g, cx, cy, scale) {
      const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.4);
      gg.addColorStop(0, rgba(g === galaxyA ? C.rgb.bone : C.rgb.lime, 0.5));
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx, cy, scale * 0.4, 0, 6.28); ctx.fill();
      for (const s of g.stars) {
        const ang = s.a + t * (g === galaxyA ? 0.2 : -0.2);
        const r = s.r * scale;
        const x = cx + Math.cos(ang) * r + s.jitter * scale;
        const y = cy + Math.sin(ang) * r * 0.7 + s.jitter * scale * 0.7;
        const col = s.hue === 'bone' ? C.rgb.bone : C.rgb.lime;
        ctx.fillStyle = rgba(col, 0.3 + (1 - s.r) * 0.7);
        ctx.fillRect(x, y, s.size, s.size);
      }
    }
    const scaleA = Math.min(W, H) * 0.22, scaleB = Math.min(W, H) * 0.22;
    drawGalaxy(galaxyA, ax, ay, scaleA);
    drawGalaxy(galaxyB, bx, by, scaleB);

    const d = Math.hypot(ax - bx, ay - by);
    const collisionRange = scaleA + scaleB - 60;
    if (d < collisionRange) {
      collisionFlash = Math.min(1, collisionFlash + dt * 4);
      mergeTimer += dt;
      if (Math.random() < 0.6) {
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        const a = Math.random() * 6.28;
        const sp = rand(2, 6);
        sparks.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, size: rand(1, 3) });
      }
    } else collisionFlash = Math.max(0, collisionFlash - dt * 2);

    if (mergeTimer > 3) {
      galaxyA.x = 0.2; galaxyA.y = 0.4; galaxyA.vx = 0.05; galaxyA.vy = 0.02;
      galaxyB.x = 0.8; galaxyB.y = 0.6; galaxyB.vx = -0.05; galaxyB.vy = -0.02;
      mergeTimer = 0;
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const q = sparks[i];
      q.x += q.vx; q.y += q.vy;
      q.vx *= 0.96; q.vy *= 0.96;
      q.life -= dt * 1.2;
      if (q.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = rgba(C.rgb.lime, q.life);
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size * q.life, 0, 6.28); ctx.fill();
    }

    if (collisionFlash > 0) {
      ctx.fillStyle = rgba(C.rgb.lime, collisionFlash * 0.08);
      ctx.fillRect(0, 0, W, H);
    }

    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(C.rgb.stone, 0.7);
    ctx.fillText('DRAG A GALAXY · CAUSE COLLISION', 20, 30);
    ctx.textAlign = 'right';
    ctx.fillStyle = collisionFlash > 0.3 ? C.lime : rgba(C.rgb.stone, 0.7);
    ctx.fillText(collisionFlash > 0.3 ? '◆ COLLISION' : 'DISTANCE: ' + Math.round(d), W - 20, 30);
  };
}

/* ================================================================
   REGISTRY
================================================================ */
const ANIMS = [
  { title: 'Asteroid Blaster',   tag: 'GAME',  create: animAsteroidBlaster },
  { title: 'Circuit Grid',       tag: 'GAME',  create: animCircuit },
  { title: 'Fusion Reactor',     tag: 'SIM',   create: animReactor },
  { title: 'Warp Drive',         tag: 'SIM',   create: animWarpDrive },
  { title: 'Laser Grid',         tag: 'GAME',  create: animLaser },
  { title: 'Nebula Painter',     tag: 'PLAY',  create: animNebulaPainter },
  { title: 'Firewall Defender',  tag: 'GAME',  create: animFirewall },
  { title: 'Cosmic Lens',        tag: 'SIM',   create: animCosmicLens },
  { title: 'Quantum Lab',        tag: 'SIM',   create: animQuantum },
  { title: 'Galactic Collision', tag: 'SIM',   create: animGalacticCollision },
];

/* ================================================================
   SETUP
================================================================ */
const grid = document.getElementById('grid');
const cards = [];

function setupCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(r.width * dpr));
  canvas.height = Math.max(1, Math.floor(r.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: r.width, H: r.height };
}

ANIMS.forEach((def, i) => {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <canvas></canvas>
    <div class="meta">
      <h3>${def.title}</h3>
      <span class="tag">${def.tag}</span>
    </div>
  `;
  grid.appendChild(card);

  const canvas = card.querySelector('canvas');
  const s = setupCanvas(canvas);
  const render = def.create();
  const pointer = new Pointer(canvas);

  const entry = { canvas, ctx: s.ctx, W: s.W, H: s.H, render, pointer, visible: false, def };
  cards.push(entry);

  new IntersectionObserver(es => {
    es.forEach(e => { entry.visible = e.isIntersecting; });
  }, { threshold: 0.05 }).observe(canvas);

  new ResizeObserver(() => {
    const r = setupCanvas(canvas);
    entry.ctx = r.ctx; entry.W = r.W; entry.H = r.H;
  }).observe(canvas);

  /* ---- Tap detection for opening fullscreen ---- */
  let tStart = 0, tStartX = 0, tStartY = 0;

  card.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    tStart = Date.now();
    tStartX = t.clientX;
    tStartY = t.clientY;
  }, { passive: true });

  card.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    const dtMs = Date.now() - tStart;
    const dx = t.clientX - tStartX;
    const dy = t.clientY - tStartY;
    if (dtMs < 300 && Math.hypot(dx, dy) < 10) {
      openFull(i);
    }
  }, { passive: true });

  card.addEventListener('click', e => {
    if (e.detail === 0) return;
    openFull(i);
  });
});

/* ================================================================
   MAIN LOOP
================================================================ */
let lastT = performance.now() * 0.001;
function loop(now) {
  const t = now * 0.001;
  const dt = Math.min(0.05, t - lastT);
  lastT = t;

  for (const c of cards) {
    if (!c.visible) continue;
    c.ctx.fillStyle = C.ink;
    c.ctx.fillRect(0, 0, c.W, c.H);
    try { c.render(c.ctx, c.W, c.H, t, dt, c.pointer); } catch (e) {}
    c.pointer.endFrame();
  }

  if (full.active && full.render && full.ctx && full.pointer) {
    full.ctx.fillStyle = C.ink;
    full.ctx.fillRect(0, 0, full.W, full.H);
    try { full.render(full.ctx, full.W, full.H, t, dt, full.pointer); } catch (e) {}
    full.pointer.endFrame();
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ================================================================
   FULLSCREEN
================================================================ */
const fullEl = document.getElementById('full');
const fCanvas = document.getElementById('fCanvas');
const fNum = document.getElementById('fNum');
const fTitle = document.getElementById('fTitle');
const fTag = document.getElementById('fTag');      // optional element in HTML
const fBack = document.getElementById('fBack');
const fPrev = document.getElementById('fPrev');
const fNext = document.getElementById('fNext');

const full = {
  active: false,
  index: 0,
  canvas: fCanvas,
  ctx: null, W: 0, H: 0,
  render: null,
  pointer: null
};

function setFullAnimation(i) {
  full.index = i;
  const def = ANIMS[i];
  fNum.textContent = String(i + 1).padStart(2, '0') + ' / ' + ANIMS.length;
  fTitle.textContent = def.title;
  if (fTag) fTag.textContent = def.tag;

  void fCanvas.offsetHeight;

  const s = setupCanvas(fCanvas);
  full.ctx = s.ctx; full.W = s.W; full.H = s.H;
  full.render = def.create();

  if (full.pointer) full.pointer.reset();
  else full.pointer = new Pointer(fCanvas);

  fPrev.classList.toggle('disabled', i === 0);
  fNext.classList.toggle('disabled', i === ANIMS.length - 1);
}

function openFull(i) {
  fullEl.classList.add('open');
  full.active = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => setFullAnimation(i));
  });
}

function closeFull() {
  fullEl.classList.remove('open');
  full.active = false;
  full.render = null;
  full.pointer = null;
  full.ctx = null;
}

function goPrev() { if (full.index > 0) setFullAnimation(full.index - 1); }
function goNext() { if (full.index < ANIMS.length - 1) setFullAnimation(full.index + 1); }

fBack.addEventListener('click', closeFull);
fPrev.addEventListener('click', goPrev);
fNext.addEventListener('click', goNext);
window.addEventListener('keydown', e => {
  if (!full.active) return;
  if (e.key === 'Escape') closeFull();
  if (e.key === 'ArrowLeft') goPrev();
  if (e.key === 'ArrowRight') goNext();
});
window.addEventListener('resize', () => {
  if (full.active) {
    const s = setupCanvas(fCanvas);
    full.ctx = s.ctx; full.W = s.W; full.H = s.H;
  }
});

/* ================================================================
   CURSOR
================================================================ */
const curDot = document.querySelector('.cur-dot');
const curRing = document.querySelector('.cur-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
window.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  curDot.style.left = mx + 'px'; curDot.style.top = my + 'px';
});
(function tick() {
  rx += (mx - rx) * 0.22; ry += (my - ry) * 0.22;
  curRing.style.left = rx + 'px'; curRing.style.top = ry + 'px';
  requestAnimationFrame(tick);
})();
document.addEventListener('mouseover', e => {
  const el = e.target.closest('a, button, .card, .back, .nav-arrow');
  document.body.classList.toggle('hov', !!el);
});
