/* ---------------------------------------------------------------
   How it works, walked through sideways.

   The track is scrubbed 1:1 against the scroll rather than stepped
   between states. That distinction is the whole reason this works
   and the played conversation that used to sit here did not: a
   horizontal move that tracks your finger feels like scrolling,
   while things popping in at thresholds feels like stuttering.

   It runs sideways at every width, phones included. One step fills the
   screen and nothing else is on it, which is the whole point of the
   section and was lost the moment it stacked into a list. The rebuild
   only fires on a width change, so a phone's address bar sliding away
   cannot tear the pin down mid-scroll.
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
      anims[i] = window.lottie.loadAnimation({
        container: host, renderer: 'svg', loop: true, autoplay: false,
        path: host.getAttribute('data-lottie')
      });
    });
  }

  /* Everything runs, always. An earlier version played only the panel in
     front and paused the rest, which sounds tidy and stutters in practice:
     under a scrubbed scroll the rounded index flips back and forth at a
     boundary and the animation restarts every time it does. Three small
     animations cost less than that ever did. */
  function live(i) {
    for (var n = 0; n < steps.length; n++) steps[n].classList.toggle('is-live', n === i);
  }

  /* Wakes just the one step, for narrow screens. */
  function awaken(i) {
    if (window.__journeyArt) window.__journeyArt.show(i - 1);   // step 0 is the Lottie
    Object.keys(anims).forEach(function (k) {
      if (+k === i) anims[k].play(); else anims[k].pause();
    });
  }

  function playAll() {
    if (window.__journeyArt) window.__journeyArt.all();
    Object.keys(anims).forEach(function (k) { anims[k].play(); });
  }

  /* Stacked, on a phone. Four animations running at once on a phone is what
     made the scroll stutter, so only what is actually on screen runs, and
     the canvases are measured again once the stacked layout has settled. */
  var stackIO = null;

  function stack() {
    section.classList.add('is-stacked');
    steps.forEach(function (s) { s.classList.add('is-live'); });

    requestAnimationFrame(function () {
      if (window.__journeyArt) { window.__journeyArt.measure(); window.__journeyArt.none(); }
    });

    if (stackIO) stackIO.disconnect();
    if (!('IntersectionObserver' in window)) { playAll(); return; }

    // The art index and the step index are not the same: step one carries a
    // Lottie and no canvas, so the canvases start one behind.
    stackIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = steps.indexOf(e.target);
        var art = i - 1;                       // step 0 is the Lottie
        if (e.isIntersecting) {
          if (anims[i]) anims[i].play();
          if (window.__journeyArt && art >= 0) window.__journeyArt.play(art);
        } else {
          if (anims[i]) anims[i].pause();
          if (window.__journeyArt && art >= 0) window.__journeyArt.stop(art);
        }
      });
    }, { rootMargin: '10% 0px', threshold: 0.15 });

    steps.forEach(function (s) { stackIO.observe(s); });
  }

  mountLottie();
  playAll();
  if (!window.lottie) {
    window.addEventListener('load', function () { mountLottie(); playAll(); });
  }

  if (reduced || !window.gsap || !window.ScrollTrigger) { stack(); return; }

  var st = null;

  function build() {
    if (st) { st.kill(true); st = null; }
    if (stackIO) { stackIO.disconnect(); stackIO = null; }
    section.classList.remove('is-stacked');
    steps.forEach(function (s) { s.classList.remove('is-live'); });

    if (window.__journeyArt) { window.__journeyArt.measure(); }
    var narrow = window.innerWidth < 900;

    // On a phone, only the step in front animates: four at once is what made
    // the scroll stutter. On desktop everything runs, which it can afford.
    if (narrow) { if (window.__journeyArt) window.__journeyArt.none(); }
    else { playAll(); }

    live(0);
    if (narrow) awaken(0);
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
      // A screen of travel per panel. Using the track width alone gives a
      // phone barely half a screen of scroll per step, which flicks past.
      end: function () {
        var per = Math.max(window.innerWidth, window.innerHeight * 0.82);
        var hold = window.innerHeight * (window.innerWidth < 900 ? 0.22 : 0.7);
        return '+=' + (per * (steps.length - 1) + hold);
      },
      pin: stage,
      pinSpacing: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        var max = track.scrollWidth - window.innerWidth;
        var per = Math.max(window.innerWidth, window.innerHeight * 0.82);
        var travel = per * (steps.length - 1);
        var total = travel + window.innerHeight * (window.innerWidth < 900 ? 0.22 : 0.7);
        // The track finishes moving before the pin does, so the last panel
        // sits still while the remaining scroll is spent.
        var p = Math.min(1, (self.progress * total) / travel);

        gsap.set(track, { x: -max * p });
        if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';

        // Each panel is scaled and dimmed by how far it is from the middle
        // of the screen, and its art and its words travel at slightly
        // different speeds. Flat panels sliding past read as a slideshow;
        // this reads as depth.
        var mid = window.innerWidth / 2;
        for (var n = 0; n < steps.length; n++) {
          var r = steps[n].getBoundingClientRect();
          var off = (r.left + r.width / 2 - mid) / window.innerWidth;   // -1..1
          var away = Math.min(1, Math.abs(off));
          gsap.set(steps[n], {
            scale: 1 - away * 0.14,
            opacity: 1 - away * 0.72,
            force3D: true
          });
          var art = steps[n].querySelector('.jart, .jpath');
          var txt = steps[n].querySelector('.jtext');
          if (art) gsap.set(art, { x: off * -70, force3D: true });
          if (txt) gsap.set(txt, { x: off * -24, force3D: true });
        }

        // A dead zone around the boundary. Rounding alone lets the index
        // flip back and forth under a scrubbed scroll, which restarts an
        // animation every time it does.
        var exact = p * (steps.length - 1);
        if (Math.abs(exact - last) > 0.62) {
          last = Math.round(exact);
          live(last);
          if (narrow) awaken(last);
        }
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
