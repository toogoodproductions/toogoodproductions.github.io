/* ============================================================
   Work index: Grid / Carousel / List tab views,
   drag-to-scroll filmstrip, cursor-riding list preview.
   ============================================================ */
(function () {
  'use strict';

  var index = document.querySelector('.work-index');
  if (!index) return;

  var grid = index.querySelector('.work-grid');
  var tabs = Array.prototype.slice.call(index.querySelectorAll('.view-switch button'));
  var nav = index.querySelector('.carousel-nav');
  var fine = window.matchMedia('(pointer: fine)').matches;

  /* ---------- Tab switching ---------- */
  function setView(view) {
    index.setAttribute('data-view', view);
    tabs.forEach(function (t) {
      var active = t.getAttribute('data-view-btn') === view;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    try { sessionStorage.setItem('workView', view); } catch (e) {}
    hidePreview();
    // let the layout settle, then re-measure scroll-driven bits
    if (window.ScrollTrigger) requestAnimationFrame(function () { ScrollTrigger.refresh(); });
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { setView(t.getAttribute('data-view-btn')); });
  });
  var saved = null;
  try { saved = sessionStorage.getItem('workView'); } catch (e) {}
  if (saved === 'carousel') saved = 'grid'; // carousel view retired
  if (saved && saved !== index.getAttribute('data-view')) setView(saved);

  /* ---------- Carousel: drag-to-scroll with release momentum ---------- */
  var drag = { on: false, moved: 0, startX: 0, startLeft: 0, lastX: 0, lastT: 0, vx: 0 };
  grid.addEventListener('pointerdown', function (e) {
    if (index.getAttribute('data-view') !== 'carousel') return;
    if (window.gsap) gsap.killTweensOf(grid);
    drag.on = true;
    drag.moved = 0;
    drag.startX = e.clientX;
    drag.startLeft = grid.scrollLeft;
    drag.lastX = e.clientX;
    drag.lastT = performance.now();
    drag.vx = 0;
    grid.setPointerCapture(e.pointerId);
  });
  grid.addEventListener('pointermove', function (e) {
    if (!drag.on) return;
    var dx = e.clientX - drag.startX;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    if (drag.moved > 5) grid.classList.add('is-dragging');
    grid.scrollLeft = drag.startLeft - dx;
    var now = performance.now();
    var dt = now - drag.lastT;
    if (dt > 0) drag.vx = (e.clientX - drag.lastX) / dt; // px per ms
    drag.lastX = e.clientX;
    drag.lastT = now;
  });
  function endDrag() {
    if (!drag.on) return;
    drag.on = false;
    // fling: carry the release velocity, then settle on the nearest snap point
    var v = drag.vx;
    if (Math.abs(v) > 0.15 && window.gsap) {
      var cellW = (grid.querySelector('.work-cell') || { offsetWidth: 400 }).offsetWidth + 20;
      var projected = grid.scrollLeft - v * 180;                    // momentum projection
      var snapped = Math.round(projected / cellW) * cellW;          // land on a slide
      grid.style.scrollSnapType = 'none';
      gsap.to(grid, {
        scrollLeft: Math.max(0, Math.min(snapped, grid.scrollWidth - grid.clientWidth)),
        duration: 0.55,
        ease: 'power3.out',
        onComplete: function () { grid.style.scrollSnapType = ''; }
      });
    }
    setTimeout(function () { grid.classList.remove('is-dragging'); }, 30);
  }
  grid.addEventListener('pointerup', endDrag);
  grid.addEventListener('pointercancel', endDrag);
  // swallow the click that follows a drag
  grid.addEventListener('click', function (e) {
    if (drag.moved > 5) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  if (nav) {
    var goStep = function (dir) {
      var cell = grid.querySelector('.work-cell');
      var w = cell ? cell.getBoundingClientRect().width + 20 : 400;
      var target = Math.round((grid.scrollLeft + dir * w) / w) * w;
      target = Math.max(0, Math.min(target, grid.scrollWidth - grid.clientWidth));
      if (window.gsap) {
        gsap.killTweensOf(grid);
        grid.style.scrollSnapType = 'none';
        gsap.to(grid, {
          scrollLeft: target,
          duration: 0.5,
          ease: 'power3.out',
          onComplete: function () { grid.style.scrollSnapType = ''; }
        });
      } else {
        grid.scrollTo({ left: target, behavior: 'smooth' });
      }
    };
    nav.querySelector('.next').addEventListener('click', function () { goStep(1); });
    nav.querySelector('.prev').addEventListener('click', function () { goStep(-1); });
  }

  /* ---------- Circular wheel: slides rotate toward ±24° and sink up to
     52% of their height as they leave center — the strip bends. ---------- */
  var MAX_DEG = 8;
  var MAX_SINK = 14; // percent of slide height at full rotation
  var COS_MAX = Math.cos(MAX_DEG * Math.PI / 180);
  var wheelCards = null;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyWheel() {
    if (reducedMotion) return;
    if (index.getAttribute('data-view') !== 'carousel') {
      if (wheelCards) {
        wheelCards.forEach(function (c) { c.style.transform = ''; });
        wheelCards = null;
      }
      return;
    }
    if (!wheelCards) wheelCards = Array.prototype.slice.call(index.querySelectorAll('.work-card'));
    var vr = grid.getBoundingClientRect();
    var center = vr.left + vr.width / 2;
    var half = vr.width / 2;
    wheelCards.forEach(function (card) {
      var r = card.getBoundingClientRect();
      var t = ((r.left + r.width / 2) - center) / half;   // -1 .. 1 across the viewport
      t = Math.max(-1.35, Math.min(1.35, t));
      var deg = t * MAX_DEG;
      var y = (1 - Math.cos(deg * Math.PI / 180)) / (1 - COS_MAX) * MAX_SINK;
      card.style.transform = 'translateY(' + y.toFixed(3) + '%) rotate(' + deg.toFixed(3) + 'deg)';
    });
  }
  if (window.gsap) gsap.ticker.add(applyWheel);
  else (function raf() { applyWheel(); requestAnimationFrame(raf); })();

  /* ---------- List view: floating preview follows the cursor ---------- */
  var preview = null, pv = { x: 0, y: 0, tx: 0, ty: 0 };
  function ensurePreview() {
    if (preview) return preview;
    preview = document.createElement('div');
    preview.className = 'work-preview';
    document.body.appendChild(preview);
    function follow() {
      pv.x += (pv.tx - pv.x) * 0.14;
      pv.y += (pv.ty - pv.y) * 0.14;
      preview.style.transform = 'translate3d(' + (pv.x + 28) + 'px,' + (pv.y - 110) + 'px,0)' +
        (preview.classList.contains('is-on') ? ' scale(1)' : ' scale(.92)');
    }
    if (window.gsap) gsap.ticker.add(follow);
    else (function raf() { follow(); requestAnimationFrame(raf); })();
    return preview;
  }
  function hidePreview() {
    if (preview) preview.classList.remove('is-on');
  }
  if (fine) {
    index.addEventListener('mousemove', function (e) {
      pv.tx = e.clientX; pv.ty = e.clientY;
    }, { passive: true });
    index.addEventListener('mouseover', function (e) {
      if (index.getAttribute('data-view') !== 'list') return;
      var card = e.target.closest('.work-card');
      if (!card) return;
      var scene = card.querySelector('.media .scene');
      if (!scene) return;
      var p = ensurePreview();
      p.innerHTML = '<div class="scene scene--still">' + scene.innerHTML + '</div>';
      p.classList.add('is-on');
    });
    index.addEventListener('mouseleave', hidePreview);
    index.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget || !e.relatedTarget.closest('.work-card')) hidePreview();
    });
  }
})();

/* ---------- Marquee measurement (exact loop distance) ---------- */
(function () {
  var tracks = document.querySelectorAll('.marquee-track');
  if (!tracks.length) return;
  function measure() {
    tracks.forEach(function (track) {
      var set = track.querySelector('.marquee-set');
      if (!set) return;
      var w = set.getBoundingClientRect().width;
      track.style.setProperty('--marquee-content-width', (-w) + 'px');
      // constant speed regardless of content length (~90px/s)
      track.style.setProperty('--marquee-duration', Math.max(18, w / 90) + 's');
    });
  }
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
