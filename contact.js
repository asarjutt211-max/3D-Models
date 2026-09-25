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
  const isHov = !!(el && el.closest('a, button, .btn, .contact-card'));
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