/* ================================================================
   WARP STARFIELD — fast-moving stars rushing toward viewer
================================================================ */
(function () {
  const canvas = document.getElementById('warp');
  const ctx = canvas.getContext('2d');
  let W, H, DPR, cx, cy;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2;
    cy = H / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  // ============================================
  // STARS
  // ============================================
  const STAR_COUNT = 1400;
  const MAX_Z = 1400;
  const FOCAL = Math.max(W, H) * 0.9;

  class Star {
    constructor() { this.reset(true); }
    reset(initial) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 600;
      this.x = Math.cos(angle) * radius;
      this.y = Math.sin(angle) * radius;
      this.z = initial ? Math.random() * MAX_Z + 50 : MAX_Z + Math.random() * 100;
      this.size = 0.5 + Math.random() * 2.2;
      const r = Math.random();
      if (r < 0.15) this.color = '232,255,0';        // lime
      else if (r < 0.25) this.color = '180,220,255'; // pale blue
      else this.color = '240,234,214';                // bone
    }
    update(dt, speed) {
      this.z -= speed * dt;
      if (this.z < 5) this.reset(false);
    }
    draw(ctx, prevZ) {
      const scale = FOCAL / this.z;
      const px = cx + this.x * scale;
      const py = cy + this.y * scale;

      // skip if offscreen
      if (px < -100 || px > W + 100 || py < -100 || py > H + 100) return;

      // speed streak: draw line from previous position
      if (prevZ !== undefined && prevZ > 5) {
        const prevScale = FOCAL / prevZ;
        const prevX = cx + this.x * prevScale;
        const prevY = cy + this.y * prevScale;
        const alpha = Math.min(1, (1 - this.z / MAX_Z) * 1.2);
        const lineWidth = Math.max(0.5, this.size * scale * 0.25);
        ctx.strokeStyle = `rgba(${this.color},${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(px, py);
        ctx.stroke();
      } else {
        const alpha = Math.min(1, (1 - this.z / MAX_Z) * 1.2);
        ctx.fillStyle = `rgba(${this.color},${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, this.size * scale * 0.15, 0, 6.283);
        ctx.fill();
      }
    }
  }

  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) stars.push(new Star());

  // ============================================
  // MOUSE CONTROL
  // ============================================
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('mousemove', e => {
    mouse.tx = (e.clientX / W - 0.5) * 2;
    mouse.ty = (e.clientY / H - 0.5) * 2;
  });

  // ============================================
  // CLICK = warp burst
  // ============================================
  let warpBoost = 0;
  window.addEventListener('click', () => {
    warpBoost = 1;
  });

  // ============================================
  // CURSOR
  // ============================================
  const curDot = document.querySelector('.cur-dot');
  const curRing = document.querySelector('.cur-ring');
  let mx = 0, my = 0, rx = 0, ry = 0;
  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
  });
  function cursorTick() {
    rx += (mx - rx) * 0.22;
    ry += (my - ry) * 0.22;
    curDot.style.left = mx + 'px';
    curDot.style.top = my + 'px';
    curRing.style.left = rx + 'px';
    curRing.style.top = ry + 'px';
    requestAnimationFrame(cursorTick);
  }
  cursorTick();

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('a, button');
    document.body.classList.toggle('hov', !!el);
  });

  // ============================================
  // ANIMATION LOOP
  // ============================================
  let last = performance.now() * 0.001;
  const BASE_SPEED = 900;  // fast default
  const MAX_SPEED = 2400;

  function loop(now) {
    const t = now * 0.001;
    const dt = Math.min(0.05, t - last);
    last = t;

    // smooth mouse
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    // decay warp
    if (warpBoost > 0) warpBoost = Math.max(0, warpBoost - dt * 1.2);

    const speed = BASE_SPEED + warpBoost * (MAX_SPEED - BASE_SPEED);

    // subtle parallax shift of center
    const px = mouse.x * 40;
    const py = mouse.y * 30;
    cx = W / 2 + px;
    cy = H / 2 + py;

    // fade trail for smooth motion
    ctx.fillStyle = 'rgba(14,14,12,0.35)';
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      const prevZ = s.z;
      s.update(dt, speed);
      s.draw(ctx, prevZ);
    }

    // center glow when warping
    if (warpBoost > 0.05) {
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 200);
      g.addColorStop(0, `rgba(232,255,0,${warpBoost * 0.15})`);
      g.addColorStop(1, 'rgba(232,255,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();