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

  /* ---- proper motion graphics, when there are any ----------------
     A .jart with data-lottie loads that animation and plays it while
     its panel is in front. The inline SVG inside stays as the thing
     that shows if the file is missing or the library never arrives,
     so the page is never a row of empty boxes.
     ---------------------------------------------------------------- */
  var players = {};

  function mountLottie() {
    if (!window.lottie) return;
    steps.forEach(function (step, i) {
      var art = step.querySelector('.jart[data-lottie]');
      if (!art || players[i]) return;
      var anim = window.lottie.loadAnimation({
        container: art,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        path: art.getAttribute('data-lottie')
      });
      anim.addEventListener('DOMLoaded', function () { art.classList.add('has-lottie'); });
      anim.addEventListener('data_failed', function () { art.classList.remove('has-lottie'); });
      players[i] = anim;
    });
  }

  function playOnly(i) {
    Object.keys(players).forEach(function (k) {
      var anim = players[k];
      if (+k === i) { anim.play(); } else { anim.pause(); }
    });
  }

  function live(i) {
    for (var n = 0; n < steps.length; n++) steps[n].classList.toggle('is-live', n === i);
    playOnly(i);
  }

  function stack() {
    section.classList.add('is-stacked');
    steps.forEach(function (s) { s.classList.add('is-live'); });
    Object.keys(players).forEach(function (k) { players[k].play(); });
  }

  mountLottie();
  if (!window.lottie) {
    // The library is loaded async so it can be absent on first paint.
    window.addEventListener('load', mountLottie);
  }

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
