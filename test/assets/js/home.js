/* ============================================================
   Home reel: full-viewport panels with clipped counter-parallax
   (incoming panel settles from y:-20% / rotate 7deg / scale 1.3),
   scroll snapping, thumbnail rail, hero intro.
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var panels = Array.prototype.slice.call(document.querySelectorAll('.reel-panel'));
  if (!panels.length) return;

  var lenis = window.__lenis || null;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------- Panel scrub motion ---------- */
  if (hasGsap && !prefersReduced) {
    gsap.registerPlugin(ScrollTrigger);

    panels.forEach(function (panel, i) {
      var inner = panel.querySelector('.reel-panel-inner');
      if (!inner) return;

      var isFirst = i === 0;
      var isLast = i === panels.length - 1;

      // ENTER: outer travels from below viewport to top-aligned.
      if (!isFirst) {
        gsap.fromTo(inner,
          {
            yPercent: -20,
            rotation: 7,
            scale: 1.3,
            autoAlpha: 0.5,
            transformOrigin: '50% 50%'
          },
          {
            yPercent: 0,
            rotation: 0,
            scale: 1,
            autoAlpha: 1,
            ease: 'none',
            immediateRender: true,
            scrollTrigger: {
              trigger: panel,
              start: 'top bottom',
              end: 'top top',
              scrub: true,
              invalidateOnRefresh: true
            }
          }
        );
      }

      // LEAVE: gentle counter-parallax as the outer clips it away.
      if (!isLast) {
        gsap.fromTo(inner,
          { yPercent: 0, scale: 1, autoAlpha: 1 },
          {
            yPercent: 18,
            scale: 1.06,
            autoAlpha: 1,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: panel,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true
            }
          }
        );
      }
    });
  }

  /* ---------- Snap to panels (panel-offset based, gesture-aware) ---------- */
  var snapState = { snapping: false, lastInput: 0, raf: null, looping: false };

  function panelTops() {
    return panels.map(function (p) { return p.offsetTop; });
  }
  function getY() { return window.scrollY || document.documentElement.scrollTop; }
  function nearestIndex(y) {
    var tops = panelTops();
    var best = 0, bestD = Infinity;
    for (var i = 0; i < tops.length; i++) {
      var d = Math.abs(tops[i] - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  function currentIndex() { return nearestIndex(getY()); }

  ['wheel', 'touchstart', 'touchmove', 'pointerdown'].forEach(function (evt) {
    window.addEventListener(evt, function () {
      snapState.lastInput = performance.now();
      snapState.snapping = false;
    }, { passive: true });
  });

  /* Bidirectional keep-scrolling loop — the reel is a circle.
     Bottom + scroll down  -> teleport to top, seed the momentum forward.
     Top + scroll up       -> teleport to the (identical) outro, seed upward.
     The seed keeps lenis moving through the seam so it reads as one
     continuous surface instead of stop-jump-start. */
  function loopUpFromTop() {
    var tops = panelTops();
    var lastTop = tops[tops.length - 1];
    if (snapState.looping) return false;
    snapState.looping = true;
    snapState.loopedAt = performance.now();
    snapState.snapping = false;
    if (lenis) lenis.scrollTo(lastTop, { immediate: true, force: true });
    window.scrollTo(0, lastTop);
    if (window.ScrollTrigger) ScrollTrigger.update();
    syncActive();
    return true;
  }

  window.addEventListener('wheel', function (e) {
    if (prefersReduced) return;
    var tops = panelTops();
    var lastTop = tops[tops.length - 1];
    var y = getY();
    if (e.deltaY > 0 && y >= lastTop - 2) {
      if (loopIfAtEnd() && lenis) {
        // carry the gesture through the seam
        lenis.scrollTo(Math.max(80, e.deltaY * 1.4), { duration: 1.1 });
      }
    } else if (e.deltaY < 0 && y <= 2) {
      if (loopUpFromTop() && lenis) {
        lenis.scrollTo(lastTop + Math.min(-80, e.deltaY * 1.4), { duration: 1.1 });
      }
    }
  }, { passive: true });

  /* Touch: same seams, teleport on directional swipe at the edges. */
  var touchY = null;
  window.addEventListener('touchstart', function (e) {
    touchY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (touchY === null) return;
    var dy = touchY - e.touches[0].clientY; // positive = scrolling down
    touchY = e.touches[0].clientY;
    var tops = panelTops();
    var lastTop = tops[tops.length - 1];
    if (dy > 0 && getY() >= lastTop - 2) loopIfAtEnd();
    else if (dy < 0 && getY() <= 2) loopUpFromTop();
  }, { passive: true });

  /* Seamless infinite loop: the last panel is a visual clone of the hero.
     Once settled on it, silently teleport to the top so the reel never
     dead-ends — scrolling down keeps flowing forward forever. */
  function loopIfAtEnd() {
    var tops = panelTops();
    var lastTop = tops[tops.length - 1];
    var y = getY();
    if (y >= lastTop - 2 && !snapState.looping) {
      snapState.looping = true;
      snapState.loopedAt = performance.now();
      snapState.snapping = false; // a cancelled snap must not lock the state
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
      if (window.ScrollTrigger) ScrollTrigger.update();
      syncActive();
      return true;
    }
    return false;
  }

  // own velocity tracker — reliable for both wheel (lenis) and native touch
  var velTrack = { lastY: 0, lastT: 0, v: 0 };
  function trackVelocity(now) {
    var y = getY();
    var dt = now - velTrack.lastT;
    if (dt > 0) velTrack.v = Math.abs(y - velTrack.lastY) / dt; // px per ms
    velTrack.lastY = y;
    velTrack.lastT = now;
  }

  function snapTick() {
    var now = performance.now();
    trackVelocity(now);
    // watchdog: a cancelled lenis tween never fires onComplete — self-heal
    if (snapState.snapping && now - (snapState.snapStarted || 0) > 2200) {
      snapState.snapping = false;
    }
    // clock-based reset (timer-free — immune to throttling)
    if (snapState.looping && now - (snapState.loopedAt || 0) > 60) {
      snapState.looping = false;
    }
    if (prefersReduced || snapState.snapping || snapState.looping) return;
    if (document.body.style.overflow === 'hidden') return; // menu open

    var idle = now - snapState.lastInput;
    var lenisVel = lenis ? Math.abs(lenis.velocity) : 0;
    // wait until the gesture is truly finished so we never fight the user
    if (idle < 260 || lenisVel > 0.05 || velTrack.v > 0.04) return;

    var y = getY();
    var tops = panelTops();
    var idx = nearestIndex(y);
    var target = tops[idx];

    if (Math.abs(target - y) < 2) { loopIfAtEnd(); return; }

    snapState.snapping = true;
    snapState.snapStarted = now;
    var dist = Math.abs(target - y);
    var dur = Math.min(1.1, 0.55 + dist / window.innerHeight * 0.6);
    if (lenis) {
      lenis.scrollTo(target, {
        duration: dur,
        easing: function (t) { return 1 - Math.pow(1 - t, 5); },
        lock: false,
        onComplete: function () {
          snapState.snapping = false;
          loopIfAtEnd();
        }
      });
    } else {
      window.scrollTo({ top: target, behavior: 'smooth' });
      setTimeout(function () { snapState.snapping = false; loopIfAtEnd(); }, 700);
    }
  }
  function snapLoop() {
    snapState.raf = requestAnimationFrame(snapLoop);
    snapTick();
  }
  snapLoop();
  // interval safety net — rAF can be starved (background tab restore, heavy frames)
  setInterval(snapTick, 200);

  // internal hook for automated tests / debugging
  window.__reel = {
    state: snapState,
    tick: snapTick,
    loopIfAtEnd: loopIfAtEnd,
    goTo: goTo,
    nearestIndex: nearestIndex
  };

  /* ---------- Thumbnail rail + dots ---------- */
  var rail = document.querySelector('.reel-rail');
  var railBtns = rail ? Array.prototype.slice.call(rail.querySelectorAll('button')) : [];
  var dots = Array.prototype.slice.call(document.querySelectorAll('.reel-dots button'));

  function goTo(index) {
    var tops = panelTops();
    var target = tops[Math.max(0, Math.min(index, tops.length - 1))];
    snapState.snapping = true;
    snapState.lastInput = performance.now() + 1200;
    if (lenis) {
      lenis.scrollTo(target, {
        duration: 1.25,
        easing: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
        onComplete: function () { snapState.snapping = false; }
      });
    } else {
      window.scrollTo({ top: target, behavior: 'smooth' });
      setTimeout(function () { snapState.snapping = false; }, 900);
    }
  }

  railBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(btn.getAttribute('data-target'), 10) || 0;
      goTo(idx);
    });
  });
  dots.forEach(function (btn, i) {
    btn.addEventListener('click', function () { goTo(i); });
  });

  function syncActive() {
    var idx = Math.min(currentIndex(), panels.length - 1);
    // last panel mirrors panel 0 (loop-back hero)
    var effective = idx % (panels.length - 1);
    railBtns.forEach(function (btn) {
      var t = parseInt(btn.getAttribute('data-target'), 10) || 0;
      btn.classList.toggle('is-active', t === effective);
    });
    dots.forEach(function (btn, i) {
      btn.classList.toggle('is-active', i === effective);
    });
  }
  window.addEventListener('scroll', syncActive, { passive: true });
  if (lenis) lenis.on('scroll', syncActive);
  syncActive();

  /* ---------- Hero intro ---------- */
  document.addEventListener('site:intro', function () {
    if (rail) rail.classList.add('is-ready');
    if (!hasGsap || prefersReduced) {
      document.querySelectorAll('.reel-panel .line-inner').forEach(function (el) {
        el.style.transform = 'none';
      });
      return;
    }
    var hero = panels[0];
    var lines = hero.querySelectorAll('.line-inner');
    var para = hero.querySelector('.hero-para');
    var cta = hero.querySelector('.hero-cta');
    var tl = gsap.timeline({ delay: 0.05 });
    tl.to(lines, {
      yPercent: 0,
      y: 0,
      duration: 1.25,
      ease: 'power4.out',
      stagger: 0.11
    }, 0);
    if (para) tl.fromTo(para, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, 0.45);
    if (cta) tl.fromTo(cta, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.6);
    if (rail) {
      tl.fromTo(rail.querySelectorAll('li'),
        { x: -18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.05, clearProps: 'all' },
        0.5);
    }
  });

  // Pre-position hero lines for masked reveal
  if (hasGsap && !prefersReduced) {
    gsap.set(document.querySelectorAll('.reel-panel .line-inner'), { yPercent: 112 });
  }

  /* ---------- Keyboard navigation ---------- */
  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var inMenu = document.querySelector('.mobile-menu.is-open');
    if (inMenu) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
      e.preventDefault();
      goTo(Math.min(currentIndex() + 1, panels.length - 1));
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
      e.preventDefault();
      var ci = currentIndex();
      if (ci === 0 && getY() <= 2) {
        // circle backwards: hero -> last project panel
        if (loopUpFromTop()) goTo(panels.length - 2);
      } else {
        goTo(Math.max(ci - 1, 0));
      }
    } else if (e.key === 'Home') {
      e.preventDefault(); goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); goTo(panels.length - 1);
    }
  });
})();
