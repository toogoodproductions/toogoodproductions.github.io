/* ---------------------------------------------------------------
   Panel background film.

   The reel stacks and overlaps its panels, so "is it on screen" is
   not a useful question - several always are. Instead the panel
   holding the viewport centre is the one that plays, everything else
   pauses in place. That keeps exactly one clip decoding no matter how
   the reel is mid-transition, and a panel you scroll back to carries on
   from where you left it.
   --------------------------------------------------------------- */
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll('.scene-video'));
  if (!vids.length) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var current = null;
  var queued = false;

  function tryPlay(v) {
    var p = v.play();
    // A rejection here is normal - the clip may not have buffered yet, or the
    // panel moved on. Either way the next sync call picks it up again.
    if (p && p.catch) p.catch(function () {});
  }

  function activate(v) {
    if (current === v) {
      if (v.paused) tryPlay(v);      // retry a play that lost its race
      return;
    }
    // Pause only - never rewind. Scrolling back to a panel should pick the
    // clip up where it left off, not restart it.
    if (current) current.pause();
    current = v;
    if (v) {
      if (v.preload !== 'auto') v.preload = 'auto';
      tryPlay(v);
    }
  }

  function sync() {
    queued = false;
    var mid = window.innerHeight / 2;
    var best = null;
    var bestDist = Infinity;

    vids.forEach(function (v) {
      var r = v.getBoundingClientRect();
      if (!r.height || r.bottom <= 0 || r.top >= window.innerHeight) return;
      var dist = Math.abs((r.top + r.bottom) / 2 - mid);
      if (dist < bestDist) { bestDist = dist; best = v; }
    });

    activate(best);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }

  vids.forEach(function (v) {
    if (v.readyState >= 3) v.classList.add('is-ready');
    else v.addEventListener('canplay', function () {
      v.classList.add('is-ready');
      if (current === v) tryPlay(v);   // buffered late, start it now
    }, { once: true });
  });

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (current) current.pause();
      return;
    }
    // rAF is suspended while hidden, so a sync queued on the way out never
    // ran and the flag would block every later one. Clear it before resuming.
    queued = false;
    schedule();
  });

  // The intro loader shifts layout after paint, so settle a few times.
  schedule();
  addEventListener('load', schedule);
  [400, 1200, 2500].forEach(function (t) { setTimeout(schedule, t); });
})();
