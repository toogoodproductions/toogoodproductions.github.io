/* ---------------------------------------------------------------
   The product's Telegram thread, played by scrolling.

   The phone is pinned and messages arrive one at a time as the page
   moves, so the conversation happens in front of you rather than
   sitting there finished. Scrolling back takes them away again.

   Narrow screens get the whole thread at once: pinning a tall phone
   on a phone leaves nowhere for it to be pinned to.
   --------------------------------------------------------------- */
(function () {
  var section = document.querySelector('[data-chat-scroll]');
  if (!section) return;

  var stage = section.querySelector('.chat-stage');
  var log = section.querySelector('.tg-log');
  var steps = Array.prototype.slice.call(section.querySelectorAll('.chat-step'));
  if (!stage || !log || !steps.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia && window.matchMedia('(min-width: 900px)').matches;

  // The four labels beside the phone tick along with the conversation.
  var marks = Array.prototype.slice.call(section.querySelectorAll('[data-phase-item]'));

  function show(n) {
    var phase = 0;
    steps.forEach(function (el, i) {
      var on = i < n;
      // A typing bubble is only true while nothing has come after it.
      if (on && el.hasAttribute('data-typing') && n > i + 1) on = false;
      if (on !== el.classList.contains('is-in')) el.classList.toggle('is-in', on);
      if (i < n) phase = +el.getAttribute('data-phase') || phase;
    });
    marks.forEach(function (m) {
      var p = +m.getAttribute('data-phase-item');
      m.classList.toggle('is-on', p === phase);
      m.classList.toggle('is-done', p < phase);
    });
  }

  if (reduced || !wide || !window.gsap || !window.ScrollTrigger) {
    section.classList.add('is-static');
    show(steps.length);
    return;
  }

  show(0);

  var last = -1;
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    // Roughly a screenful of scroll per message, plus a beat at the end so
    // the finished thread sits still and readable before the pin releases.
    end: '+=' + ((steps.length + 3) * 190),
    pin: stage,
    pinSpacing: true,
    invalidateOnRefresh: true,
    onUpdate: function (self) {
      // Everything has arrived by 82% of the way through, and the rest of
      // the pin is the pause on the finished thread.
      var n = Math.round((self.progress / 0.82) * steps.length);
      if (n > steps.length) n = steps.length;
      if (n < 0) n = 0;
      if (n === last) return;
      last = n;
      show(n);
    }
  });
})();
