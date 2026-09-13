/* ---------------------------------------------------------------
   How it works, walked through sideways.

   The track is scrubbed 1:1 against the scroll rather than stepped
   between states. That distinction is the whole reason this works
   and the played conversation that used to sit here did not: a
   horizontal move that tracks your finger feels like scrolling,
   while things popping in at thresholds feels like stuttering.

   Narrow screens get the four steps stacked. Pinning a full-width
   track on a phone is a fight with the address bar nobody wins.
   --------------------------------------------------------------- */
(function () {
  var section = document.querySelector('[data-journey]');
  if (!section) return;

  var stage = section.querySelector('.journey-stage');
  var track = section.querySelector('[data-journey-track]');
  var steps = Array.prototype.slice.call(section.querySelectorAll('[data-jstep]'));
  var bar = section.querySelector('[data-journey-bar]');
  if (!stage || !track || !steps.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* A step can carry a Lottie file instead of a canvas. It plays only while
     its panel is in front, like everything else here. */
  var anims = {};

  function mountLottie() {
    if (!window.lottie) return;
    steps.forEach(function (step, i) {
      var host = step.querySelector('[data-lottie]');
      if (!host || anims[i]) return;
      // It loops, but it does not run without pause. The animation plays
      // through, holds on its last frame for a beat, then goes again, so
      // the panel reads as something that happened rather than a thing
      // jittering in the corner of your eye.
      var a = window.lottie.loadAnimation({
        container: host, renderer: 'svg', loop: false, autoplay: false,
        path: host.getAttribute('data-lottie')
      });
      a.__wanted = false;
      a.addEventListener('complete', function () {
        if (a.__hold) clearTimeout(a.__hold);
        a.__hold = setTimeout(function () {
          if (a.__wanted) { a.goToAndPlay(0, true); }
        }, 1400);
      });
      anims[i] = a;
    });
  }

  function live(i) {
    for (var n = 0; n < steps.length; n++) steps[n].classList.toggle('is-live', n === i);
    if (window.__journeyArt) window.__journeyArt.show(i);
    Object.keys(anims).forEach(function (k) {
      var a = anims[k];
      a.__wanted = (+k === i);
      if (a.__wanted) { a.play(); }
      else { a.pause(); if (a.__hold) clearTimeout(a.__hold); }
    });
  }

  function stack() {
    section.classList.add('is-stacked');
    steps.forEach(function (s) { s.classList.add('is-live'); });
    if (window.__journeyArt) window.__journeyArt.all();
    Object.keys(anims).forEach(function (k) { anims[k].__wanted = true; anims[k].play(); });
  }

  mountLottie();
  if (!window.lottie) window.addEventListener('load', mountLottie);

  if (reduced || !window.gsap || !window.ScrollTrigger) { stack(); return; }

  var st = null;

  function build() {
    if (st) { st.kill(true); st = null; }
    section.classList.remove('is-stacked');
    steps.forEach(function (s) { s.classList.remove('is-live'); });

    if (window.innerWidth < 900) { stack(); return; }

    live(0);
    var last = 0;

    st = ScrollTrigger.create({
      // The stage is the trigger, not the section. Triggering on the section
      // pins the stage wherever it happened to be sitting under the heading,
      // which parks a full-height stage a heading's worth down the viewport
      // and leaves every panel riding low.
      trigger: stage,
      start: 'top top',
      // A screen of scroll per panel, plus a held beat at the end. Without
      // the hold the pin releases the instant the last panel arrives and the
      // closing frame, which is the one asking for the sale, flashes past.
      end: function () { return '+=' + (track.scrollWidth - window.innerWidth + window.innerHeight * 0.7); },
      pin: stage,
      pinSpacing: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        var max = track.scrollWidth - window.innerWidth;
        var total = max + window.innerHeight * 0.7;
        // The track finishes moving before the pin does, so the last panel
        // sits still while the remaining scroll is spent.
        var p = Math.min(1, (self.progress * total) / max);

        gsap.set(track, { x: -max * p });
        if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';

        var i = Math.round(p * (steps.length - 1));
        if (i !== last) { last = i; live(i); }
      }
    });
  }

  build();

  var w = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === w) return;   // a phone's address bar, not a resize
    w = window.innerWidth;
    build();
  });
})();
