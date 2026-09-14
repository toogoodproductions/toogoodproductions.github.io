/* ---------------------------------------------------------------
   Any card that holds a film loops it silently while it is on screen.

   Work cards opt in by their class; anything else by data-loop-film.

   Clips load lazily and only what is actually in the viewport
   decodes - eight fetched on first paint would cost more than the
   page itself. The full film lives on each project page.
   --------------------------------------------------------------- */
(function () {
  var cards = Array.prototype.slice.call(
    document.querySelectorAll('.work-card, [data-loop-film]'));
  if (!cards.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Card previews ---------- */

  function start(v) {
    if (!v) return;
    if (v.preload === 'none') v.preload = 'auto';
    if (!v.src) return;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  var vids = cards.map(function (c) { return c.querySelector('video'); }).filter(Boolean);

  vids.forEach(function (v) {
    v.muted = true;
    v.setAttribute('webkit-playsinline', '');
  });

  if (!reduced) {
    // Cards loop continuously while on screen, the way Secret Level does -
    // a card is never a still waiting to be hovered. Only what is actually
    // in the viewport decodes, so scrolling past eight of them is cheap.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target.querySelector('video');
        if (!v) return;
        if (e.isIntersecting) {
          if (v.preload === 'none') v.preload = 'auto';
          start(v);
        } else if (!v.paused) {
          v.pause();                 // pause in place, never rewind
        }
      });
    }, { rootMargin: '20% 0px', threshold: 0.2 });

    cards.forEach(function (c) { io.observe(c); });

    // A phone can refuse programmatic playback until a real gesture.
    function unlock() {
      cards.forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) start(c.querySelector('video'));
      });
    }
    ['touchstart', 'pointerdown', 'keydown'].forEach(function (evt) {
      addEventListener(evt, unlock, { once: true, passive: true });
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) vids.forEach(function (v) { v.pause(); });
      else unlock();
    });
  }
})();
