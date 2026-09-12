/* ---------------------------------------------------------------
   The product's Telegram thread, played by scrolling.

   The phone pins and messages arrive one at a time as the page moves,
   so the conversation happens in front of you rather than sitting
   there finished. Scrolling back takes them away again - that is the
   whole experience, not a side effect.

   On a phone the thread is the only thing on screen. It is the selling
   point, and a column of explanation beside it is not.
   --------------------------------------------------------------- */
(function () {
  var section = document.querySelector('[data-chat-scroll]');
  if (!section) return;

  var stage = section.querySelector('.chat-stage');
  var steps = Array.prototype.slice.call(section.querySelectorAll('.chat-step'));
  if (!stage || !steps.length) return;

  var marks = Array.prototype.slice.call(section.querySelectorAll('[data-phase-item]'));
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(n) {
    var phase = 0;
    for (var i = 0; i < steps.length; i++) {
      var el = steps[i];
      var on = i < n;
      // A typing bubble is only true while nothing has come after it.
      if (on && el.hasAttribute('data-typing') && n > i + 1) on = false;
      if (on !== el.classList.contains('is-in')) el.classList.toggle('is-in', on);
      if (i < n) phase = +el.getAttribute('data-phase') || phase;
    }
    for (var j = 0; j < marks.length; j++) {
      var p = +marks[j].getAttribute('data-phase-item');
      marks[j].classList.toggle('is-on', p === phase);
      marks[j].classList.toggle('is-done', p < phase);
    }
  }

  if (reduced || !window.gsap || !window.ScrollTrigger) {
    section.classList.add('is-static');
    show(steps.length);
    return;
  }

  show(0);

  var trigger = null;
  var last = -1;

  function build() {
    if (trigger) { trigger.kill(true); trigger = null; }
    last = -1;

    var narrow = window.innerWidth < 900;
    // Generous room per message. Too little and the messages snap past in a
    // stutter; this is what makes the thread feel played rather than scrubbed.
    var per = narrow ? 210 : 250;

    trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + ((steps.length + 2) * per),
      pin: stage,
      pinSpacing: true,
      // Starts the pin a frame early, which is what stops the jolt as it
      // takes hold under smooth scrolling.
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        // Everything has arrived by 84% of the way through; the rest of the
        // pin is a pause on the finished thread before the page moves on.
        var raw = (self.progress / 0.84) * steps.length;
        var n = Math.floor(raw + 0.35);
        if (n > steps.length) n = steps.length;
        if (n < 0) n = 0;
        if (n === last) return;
        last = n;
        show(n);
      }
    });
  }

  build();

  // Rebuilding on a width change only, so a phone's address bar sliding away
  // does not tear the pin down mid-scroll.
  var w = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === w) return;
    w = window.innerWidth;
    build();
  });
})();
