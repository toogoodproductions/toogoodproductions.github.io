/* ============================================================
   Shared chrome: smooth scroll, loader, menu, reveals, footer
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Always open at the top ----------
     Browser scroll restoration drops a reload mid-panel, landing between
     snap points. Restoration happens AFTER scripts run, so re-assert the
     top across the load sequence. Skipped for #anchor links. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) {
    var forceTop = function () {
      window.scrollTo(0, 0);
      if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true, force: true });
      if (window.ScrollTrigger) ScrollTrigger.update();
    };
    forceTop();
    requestAnimationFrame(forceTop);
    window.addEventListener('load', function () {
      forceTop();
      requestAnimationFrame(forceTop);
    });
  }

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (!prefersReduced && window.Lenis) {
    lenis = new Lenis({
      duration: 1.35,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5
    });
    window.__lenis = lenis;

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  } else if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ---------- Page loader ---------- */
  var loader = document.querySelector('.loader');
  var body = document.body;

  function runIntro() {
    document.dispatchEvent(new CustomEvent('site:intro'));
  }

  if (loader) {
    body.classList.add('is-loading');
    if (lenis) lenis.stop();

    // Safety: never leave the loader stuck (background tabs pause rAF).
    var introFired = false;
    var forceDone = function () {
      if (introFired) return;
      introFired = true;
      body.classList.remove('is-loading');
      if (lenis) lenis.start();
      if (loader.parentNode) loader.remove();
      runIntro();
    };
    setTimeout(forceDone, 3800);
    document.addEventListener('visibilitychange', function onVis() {
      if (!document.hidden && document.body.classList.contains('is-loading')) {
        // resumed from a hidden tab — give the timeline a moment, then force
        setTimeout(function () {
          if (document.querySelector('.loader')) forceDone();
        }, 2500);
      }
    });

    var logo = loader.querySelector('.loader-logo');
    var count = loader.querySelector('.loader-count');
    var isFirstVisit = !sessionStorage.getItem('visited');
    sessionStorage.setItem('visited', '1');
    // cinematic loader on the first visit only — page-to-page must feel instant
    var total = (prefersReduced || !isFirstVisit) ? 0 : 1100;

    if (window.gsap && total > 0) {
      var proxy = { v: 0 };
      var tl = gsap.timeline({ onComplete: forceDone });
      tl.to(logo, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0);
      tl.to(proxy, {
        v: 100,
        duration: total / 1000,
        ease: 'power3.inOut',
        onUpdate: function () {
          if (count) count.textContent = String(Math.round(proxy.v)).padStart(3, '0');
        }
      }, 0);
      tl.to(loader, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 0.85,
        ease: 'power4.inOut'
      }, '+=0.1');
      loader.style.clipPath = 'inset(0% 0% 0% 0%)';
    } else if (!prefersReduced) {
      // return visit: quick fade keeps the black continuity from the veil
      loader.classList.add('loader-fade');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { loader.style.opacity = '0'; });
      });
      setTimeout(forceDone, 320);
      // hidden-tab insurance: rAF may not fire — forceDone's 3.8s cap still applies
    } else {
      forceDone();
    }
  } else {
    requestAnimationFrame(runIntro);
  }

  /* ---------- Page transition veil ---------- */
  var veil = document.createElement('div');
  veil.className = 'veil';
  document.body.appendChild(veil);

  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || a.target === '_blank' || a.hasAttribute('download')) return;
    if (/^(https?:|mailto:|tel:)/.test(href)) return;
    e.preventDefault();
    veil.classList.add('is-active');
    setTimeout(function () { window.location.href = href; }, 170);
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) veil.classList.remove('is-active');
  });

  /* Hover prefetch — the next page is already cached before the click lands */
  var prefetched = {};
  document.addEventListener('mouseover', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || prefetched[href]) return;
    if (/^(https?:|mailto:|tel:|#)/.test(href) || href.charAt(0) === '#') return;
    prefetched[href] = 1;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    document.head.appendChild(l);
  }, { passive: true });

  /* ---------- Mobile menu ---------- */
  var menu = document.querySelector('.mobile-menu');
  var menuOpenBtn = document.querySelector('[data-menu-open]');
  var menuCloseBtn = document.querySelector('[data-menu-close]');

  function openMenu() {
    if (!menu) return;
    menu.classList.add('is-open');
    if (lenis) lenis.stop();
    body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    if (lenis) lenis.start();
    body.style.overflow = '';
  }
  if (menuOpenBtn) menuOpenBtn.addEventListener('click', openMenu);
  if (menuCloseBtn) menuCloseBtn.addEventListener('click', closeMenu);
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- Active nav link ---------- */
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.header-nav a, .mobile-menu nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path) a.classList.add('is-active');
  });

  /* ---------- Reveal on scroll (armed AFTER the intro so above-the-fold
     entrances play in front of the user, never under the loader) ---------- */
  function initReveals() {
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (!revealEls.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    revealEls.forEach(function (el) {
      var group = el.closest('[data-reveal-group]');
      if (group) {
        var siblings = Array.prototype.slice.call(group.querySelectorAll('[data-reveal]'));
        var idx = siblings.indexOf(el);
        el.style.setProperty('--reveal-delay', (idx * 0.08) + 's');
      } else if (el.getBoundingClientRect().top < window.innerHeight) {
        // above the fold: choreograph after the heading sweep
        el.style.setProperty('--reveal-delay', '0.35s');
      }
      io.observe(el);
    });
  }

  /* ---------- Masked line reveals ---------- */
  var maskParents = Array.prototype.slice.call(document.querySelectorAll('[data-mask-reveal]'));
  if (window.gsap) {
    maskParents.forEach(function (parent) {
      gsap.set(parent.querySelectorAll('.line-inner'), { yPercent: 112 });
    });
  }
  function playMask(parent, delay) {
    var inners = parent.querySelectorAll('.line-inner');
    if (window.gsap) {
      gsap.to(inners, {
        y: 0, yPercent: 0,
        duration: 1.15,
        ease: 'power4.out',
        stagger: 0.09,
        delay: delay || 0,
        overwrite: true
      });
    } else {
      inners.forEach(function (el) { el.style.transform = 'none'; });
    }
  }
  function initMaskReveals() {
    maskParents.forEach(function (parent) {
      if (parent.getBoundingClientRect().top < window.innerHeight * 0.9) {
        playMask(parent, 0.1); // in first view: part of the entrance choreography
      } else if (window.gsap && window.ScrollTrigger) {
        ScrollTrigger.create({
          trigger: parent,
          start: 'top 85%',
          once: true,
          onEnter: function () { playMask(parent, 0); }
        });
      } else {
        playMask(parent, 0);
      }
    });
  }

  /* ---------- Cursor spotlight — a soft glow that rides the mouse over
     every dark surface (desktop pointers only) ---------- */
  (function initSpotlight() {
    if (prefersReduced) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    var glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    var pos = { x: innerWidth / 2, y: innerHeight * 0.4 };
    var target = { x: pos.x, y: pos.y };
    var visible = false;

    document.addEventListener('mousemove', function (e) {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) { visible = true; glow.classList.add('is-on'); }
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      visible = false;
      glow.classList.remove('is-on');
    });

    function follow() {
      pos.x += (target.x - pos.x) * 0.12;
      pos.y += (target.y - pos.y) * 0.12;
      glow.style.transform = 'translate3d(' + (pos.x) + 'px,' + (pos.y) + 'px,0) translate(-50%,-50%)';
    }
    if (window.gsap) gsap.ticker.add(follow);
    else (function raf() { follow(); requestAnimationFrame(raf); })();
  })();

  /* ---------- Word-scrub statements ---------- */
  var statements = document.querySelectorAll('[data-word-scrub]');
  if (statements.length && window.gsap && window.ScrollTrigger && !prefersReduced) {
    statements.forEach(function (el) {
      var text = el.textContent.trim();
      el.setAttribute('aria-label', text);
      el.innerHTML = text.split(/\s+/).map(function (w) {
        return '<span class="word" aria-hidden="true">' + w + '</span>';
      }).join(' ');
      var words = el.querySelectorAll('.word');
      gsap.to(words, {
        opacity: 1,
        stagger: 0.06,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top 78%',
          end: 'bottom 45%',
          scrub: 0.4
        }
      });
    });
  } else {
    statements.forEach(function (el) {
      el.querySelectorAll('.word').forEach(function (w) { w.style.opacity = 1; });
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var open = item.classList.contains('is-open');
      item.parentElement.querySelectorAll('.faq-item.is-open').forEach(function (o) {
        o.classList.remove('is-open');
      });
      if (!open) item.classList.add('is-open');
    });
  });

  /* ---------- Newsletter (demo) ---------- */
  document.querySelectorAll('form.newsletter').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.newsletter-note');
      if (note) {
        note.textContent = 'Thanks — you are on the list. (Demo only)';
        note.classList.add('success');
      }
      form.reset();
    });
  });

  /* ---------- Entrance choreography (fires when the loader clears) ---------- */
  document.addEventListener('site:intro', function () {
    initMaskReveals();
    initReveals();
    if (!window.gsap || prefersReduced) return;
    var bits = document.querySelectorAll('.site-header > *');
    gsap.fromTo(bits,
      { y: -16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.05, clearProps: 'all' }
    );
  });

  /* ---------- Anchor scrolls via Lenis ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
