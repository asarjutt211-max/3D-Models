/* ================================================================
   CURSOR
================================================================ */
const curDot = document.querySelector('.cur-dot');
const curRing = document.querySelector('.cur-ring');

document.addEventListener('mousemove', e => {
  curDot.style.left = e.clientX + 'px';
  curDot.style.top = e.clientY + 'px';
  curRing.style.left = e.clientX + 'px';
  curRing.style.top = e.clientY + 'px';
}, { capture: true, passive: true });

let lastHov = false;
document.addEventListener('mousemove', e => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const isHov = !!(el && el.closest('a, button, .btn, .stat'));
  if (isHov !== lastHov) {
    lastHov = isHov;
    document.body.classList.toggle('hov', isHov);
  }
}, { capture: true, passive: true });

/* ================================================================
   SCROLL REVEAL
================================================================ */
(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(el => obs.observe(el));
})();

/* ================================================================
   STAT COUNTERS
================================================================ */
(function initCounters() {
  const stats = document.querySelectorAll('.stat-n');
  if (!stats.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.done) return;
      el.dataset.done = '1';

      const target = parseInt(el.dataset.count, 10) || 0;
      const unit = el.querySelector('.unit');
      const unitHTML = unit ? unit.outerHTML : '';

      const dur = 1400;
      const start = performance.now();

      function step(now) {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const cur = Math.round(target * eased);
        el.innerHTML = cur + unitHTML;
        if (p < 1) requestAnimationFrame(step);
        else el.innerHTML = target + unitHTML;
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.35 });

  stats.forEach(s => obs.observe(s));
})();