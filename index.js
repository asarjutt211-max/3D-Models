/* ================================================================
   ADVANCED WARP STARFIELD
   - Multi-layer stars (depth parallax)
   - Shooting stars
   - Gyroscope parallax on mobile
   - Touch trail
   - Adaptive performance
   - Warp distortion
   - Preloader
================================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('warp');
  const ctx = canvas.getContext('2d', { alpha: false });

  // ============================================================
  // DEVICE DETECTION
  // ============================================================
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
               || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  const isMobile = window.innerWidth <= 768;
  const isLowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

  // ============================================================
  // CANVAS
  // ============================================================
  let W, H, DPR, cx, cy;
  let maxDPR = isTouch ? 1.5 : 2;
  if (isLowPower) maxDPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, maxDPR);
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
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
  }

  // ============================================================
  // STAR FIELD — 3 DEPTH LAYERS
  // ============================================================
  const MAX_Z = 1400;
  const FOCAL = Math.max(W, H) * 0.9;

  let STAR_COUNT = isMobile ? 600 : 1200;
  if (isLowPower) STAR_COUNT = Math.round(STAR_COUNT * 0.6);

  class Star {
    constructor(layer) {
      this.layer = layer;
      this.hidden = false;
      this.reset(true);
    }
    reset(initial) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 600;
      this.x = Math.cos(angle) * radius;
      this.y = Math.sin(angle) * radius;
      this.z = initial ? Math.random() * MAX_Z + 50 : MAX_Z + Math.random() * 100;
      const layerScale = this.layer === 0 ? 0.5 : (this.layer === 1 ? 1 : 1.6);
      this.size = (0.4 + Math.random() * 1.8) * layerScale;
      this.brightness = this.layer === 0 ? 0.55 : (this.layer === 1 ? 0.85 : 1);
      const r = Math.random();
      if (r < 0.15) this.color = '232,255,0';
      else if (r < 0.25) this.color = '180,220,255';
      else if (r < 0.32) this.color = '255,220,180';
      else this.color = '240,234,214';
    }
    update(dt, speed) {
      this.z -= speed * dt * (0.6 + this.layer * 0.35);
      if (this.z < 5) this.reset(false);
    }
    draw(ctx, prevZ) {
      const scale = FOCAL / this.z;
      const px = cx + this.x * scale;
      const py = cy + this.y * scale;
      if (px < -120 || px > W + 120 || py < -120 || py > H + 120) return;

      const depthAlpha = Math.min(1, (1 - this.z / MAX_Z) * 1.3) * this.brightness;
      if (depthAlpha < 0.05) return;

      if (prevZ !== undefined && prevZ > 5) {
        const prevScale = FOCAL / prevZ;
        const prevX = cx + this.x * prevScale;
        const prevY = cy + this.y * prevScale;
        const lineWidth = Math.max(0.4, this.size * scale * 0.22);
        ctx.strokeStyle = `rgba(${this.color},${depthAlpha})`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(px, py);
        ctx.stroke();
      } else {
        if (this.layer === 2 && this.size > 1.5) {
          const g = ctx.createRadialGradient(px, py, 0, px, py, this.size * 3);
          g.addColorStop(0, `rgba(${this.color},${depthAlpha * 0.4})`);
          g.addColorStop(1, `rgba(${this.color},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, this.size * 3, 0, 6.283);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${this.color},${depthAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.5, this.size * scale * 0.15), 0, 6.283);
        ctx.fill();
      }
    }
  }

  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = Math.random();
    const layer = r < 0.5 ? 0 : (r < 0.85 ? 1 : 2);
    stars.push(new Star(layer));
  }

  // ============================================================
  // SHOOTING STARS
  // ============================================================
  const shootingStars = [];
  const SHOOTING_MAX = isMobile ? 2 : 4;

  function spawnShooting() {
    if (shootingStars.length >= SHOOTING_MAX) return;
    const startX = Math.random() * W;
    const startY = -50;
    const angle = 0.4 + Math.random() * 0.6;
    const speed = 400 + Math.random() * 400;
    shootingStars.push({
      x: startX, y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: 80 + Math.random() * 120,
      life: 1,
      color: Math.random() < 0.5 ? '232,255,0' : '240,234,214'
    });
  }

  setInterval(() => {
    if (Math.random() < 0.4) spawnShooting();
  }, 3000);
  setTimeout(spawnShooting, 1500);

  function drawShootingStars(dt) {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt * 0.8;

      if (s.life <= 0 || s.y > H + 100 || s.x > W + 100) {
        shootingStars.splice(i, 1);
        continue;
      }

      const angle = Math.atan2(s.vy, s.vx);
      const tailX = s.x - Math.cos(angle) * s.len;
      const tailY = s.y - Math.sin(angle) * s.len;

      const grd = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grd.addColorStop(0, `rgba(${s.color},${s.life})`);
      grd.addColorStop(0.5, `rgba(${s.color},${s.life * 0.4})`);
      grd.addColorStop(1, `rgba(${s.color},0)`);

      ctx.strokeStyle = grd;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      const headG = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 8);
      headG.addColorStop(0, `rgba(255,255,255,${s.life})`);
      headG.addColorStop(1, `rgba(${s.color},0)`);
      ctx.fillStyle = headG;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8, 0, 6.283);
      ctx.fill();
    }
  }

  // ============================================================
  // TOUCH TRAIL (mobile)
  // ============================================================
  const trailDots = [];
  const TRAIL_MAX = isMobile ? 30 : 60;

  function addTrailDot(x, y) {
    trailDots.push({
      x, y,
      life: 1,
      size: 3 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30
    });
    if (trailDots.length > TRAIL_MAX) trailDots.shift();
  }

  function drawTrail(dt) {
    for (let i = trailDots.length - 1; i >= 0; i--) {
      const d = trailDots[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt * 1.2;
      d.size *= 0.97;
      if (d.life <= 0) {
        trailDots.splice(i, 1);
        continue;
      }
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size * 2);
      g.addColorStop(0, `rgba(232,255,0,${d.life * 0.7})`);
      g.addColorStop(1, `rgba(232,255,0,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size * 2, 0, 6.283);
      ctx.fill();
    }
  }

  // ============================================================
  // INPUT HANDLING
  // ============================================================
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, gyroX: 0, gyroY: 0 };
  let warpBoost = 0;
  let isPointerDown = false;

  window.addEventListener('pointermove', e => {
    pointer.tx = (e.clientX / W - 0.5) * 2;
    pointer.ty = (e.clientY / H - 0.5) * 2;
    if (isTouch && e.pointerType === 'touch') {
      addTrailDot(e.clientX, e.clientY);
    }
  }, { passive: true });

  window.addEventListener('pointerdown', e => {
    warpBoost = 1;
    isPointerDown = true;
    if (isTouch && e.pointerType === 'touch') {
      addTrailDot(e.clientX, e.clientY);
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }, { passive: true });

  window.addEventListener('pointerup', () => {
    isPointerDown = false;
  }, { passive: true });

  window.addEventListener('pointercancel', () => {
    isPointerDown = false;
  }, { passive: true });

  if (isTouch && window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => {
      if (e.gamma !== null && e.beta !== null) {
        pointer.gyroX = Math.max(-1, Math.min(1, e.gamma / 30));
        pointer.gyroY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      }
    }, { passive: true });
  }

  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd < 350) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());
  document.addEventListener('gestureend', e => e.preventDefault());

  // ============================================================
  // CURSOR (desktop only)
  // ============================================================
  if (!isTouch) {
    const curDot = document.querySelector('.cur-dot');
    const curRing = document.querySelector('.cur-ring');

    if (curDot && curRing) {
      let mx = 0, my = 0, rx = 0, ry = 0;

      window.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
      }, { passive: true });

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
        const el = e.target.closest('a, button, .btn');
        document.body.classList.toggle('hov', !!el);
      });
    }
  }

  // ============================================================
  // ADAPTIVE PERFORMANCE
  // ============================================================
  const hudFps = document.getElementById('hudFps');
  const hudStatus = document.getElementById('hudStatus');
  let frameCount = 0;
  let fpsLastTime = performance.now();
  let currentFps = 60;
  let perfMode = 'high';
  let qualityCheckCount = 0;

  let isPaused = false;
  let last = performance.now() * 0.001;

  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
    if (!isPaused) last = performance.now() * 0.001;
  });

  // ============================================================
  // MAIN LOOP
  // ============================================================
  const BASE_SPEED = isMobile ? 700 : 900;
  const MAX_SPEED = isMobile ? 1800 : 2400;

  function loop(now) {
    requestAnimationFrame(loop);
    if (isPaused) return;

    const t = now * 0.001;
    const dt = Math.min(0.05, t - last);
    last = t;

    frameCount++;
    if (now - fpsLastTime >= 500) {
      currentFps = Math.round(frameCount * 1000 / (now - fpsLastTime));
      frameCount = 0;
      fpsLastTime = now;

      if (hudFps) hudFps.textContent = currentFps + ' FPS';

      qualityCheckCount++;
      if (qualityCheckCount > 4 && isTouch) {
        if (currentFps < 40 && perfMode === 'high') {
          perfMode = 'medium';
          for (let i = 0; i < stars.length; i += 3) stars[i].hidden = true;
        } else if (currentFps < 30 && perfMode === 'medium') {
          perfMode = 'low';
          for (let i = 0; i < stars.length; i += 2) stars[i].hidden = true;
        }
      }
    }

    const gyroWeight = isTouch ? 0.4 : 0;
    pointer.x += ((pointer.tx + pointer.gyroX * gyroWeight) - pointer.x) * 0.06;
    pointer.y += ((pointer.ty + pointer.gyroY * gyroWeight) - pointer.y) * 0.06;

    if (warpBoost > 0) {
      warpBoost = Math.max(0, warpBoost - dt * (isPointerDown ? 0.3 : 1.2));
    }

    const speed = BASE_SPEED + warpBoost * (MAX_SPEED - BASE_SPEED);

    const px = pointer.x * 40;
    const py = pointer.y * 30;
    cx = W / 2 + px;
    cy = H / 2 + py;

    const fade = warpBoost > 0.3 ? 0.5 : 0.35;
    ctx.fillStyle = `rgba(14,14,12,${fade})`;
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      if (s.hidden) continue;
      const prevZ = s.z;
      s.update(dt, speed);
      s.draw(ctx, prevZ);
    }

    drawShootingStars(dt);
    if (isTouch) drawTrail(dt);

    if (warpBoost > 0.1) {
      const intensity = warpBoost * 0.2;
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 250);
      g.addColorStop(0, `rgba(232,255,0,${intensity})`);
      g.addColorStop(0.5, `rgba(232,255,0,${intensity * 0.3})`);
      g.addColorStop(1, 'rgba(232,255,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    if (hudStatus) {
      if (warpBoost > 0.5) hudStatus.textContent = 'HYPERJUMP';
      else if (warpBoost > 0.1) hudStatus.textContent = 'WARPING';
      else hudStatus.textContent = 'WARP ACTIVE';
    }
  }
  requestAnimationFrame(loop);

  // ============================================================
  // KEYBOARD SHORTCUTS (desktop)
  // ============================================================
  if (!isTouch) {
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !e.repeat) {
        warpBoost = 1;
        e.preventDefault();
      }
    });
  }

  // ============================================================
  // PRELOADER
  // ============================================================
  const preloader = document.getElementById('preloader');
  if (preloader) {
    const plFill = document.getElementById('plFill');
    const plText = document.getElementById('plText');

    const steps = [
      { pct: 20, text: 'Calibrating sensors' },
      { pct: 45, text: 'Spawning stars' },
      { pct: 70, text: 'Warping space-time' },
      { pct: 100, text: 'Ready' }
    ];

    let i = 0;
    function advance() {
      if (i >= steps.length) {
        setTimeout(() => {
          preloader.classList.add('done');
          if (navigator.vibrate) navigator.vibrate(30);
        }, 200);
        return;
      }
      const s = steps[i];
      if (plFill) plFill.style.width = s.pct + '%';
      if (plText) plText.textContent = s.text;
      i++;
      setTimeout(advance, 350 + Math.random() * 200);
    }
    setTimeout(advance, 200);
  }
})();
