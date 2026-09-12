/* ---------------------------------------------------------------
   The product's Telegram thread, played once, start to finish.

   Two versions were wrong before this one, and both are worth knowing.

   Tied to the scrollbar, with the phone pinned and a message per so
   many pixels moved, it stuttered - a conversation does not happen in
   scroll distance.

   Made properly interactive, with real buttons to tap, it worked but
   nobody knew to tap them. A phone on a page does not read as a thing
   you can use, and a demo that waits for an action the visitor never
   takes is a demo that never plays.

   So it plays itself. The bot's buttons light up as though they were
   pressed, the input records a voice note the way a founder actually
   answers a message, and at the end there is somewhere to go.

   Nothing here touches the scroll. Trapping someone for twenty seconds
   to make them watch is worse than them not watching.
   --------------------------------------------------------------- */
(function () {
  var section = document.querySelector('[data-chat-play]');
  if (!section) return;

  var phone = section.querySelector('.phone');
  var draft = section.querySelector('[data-chat-draft]');
  var rec = section.querySelector('[data-chat-rec]');
  var recTime = section.querySelector('[data-chat-rectime]');
  var input = section.querySelector('.tg-input');
  var replay = section.querySelector('[data-chat-replay]');
  var steps = Array.prototype.slice.call(section.querySelectorAll('.chat-step'));
  var marks = Array.prototype.slice.call(section.querySelectorAll('[data-phase-item]'));
  if (!phone || !steps.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IDLE = 'Message';

  function setPhase(p) {
    for (var i = 0; i < marks.length; i++) {
      var n = +marks[i].getAttribute('data-phase-item');
      marks[i].classList.toggle('is-on', n === p);
      marks[i].classList.toggle('is-done', n < p);
    }
  }

  if (reduced) {
    section.classList.add('is-static');
    steps.forEach(function (el) {
      if (!el.hasAttribute('data-typing')) el.classList.add('is-in');
    });
    section.querySelectorAll('[data-tap]').forEach(function (el) { tap(el); });
    setPhase(4);
    return;
  }

  var timers = [];
  var at = 0;

  function wait(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }

  // Lights the bot's inline button the founder would have pressed.
  function tap(el) {
    var spec = (el.getAttribute('data-tap') || '').split(':');
    if (spec.length !== 2) return;
    var keys = section.querySelector('[data-keys="' + spec[0] + '"]');
    if (!keys) return;
    var key = keys.querySelector('[data-value="' + spec[1] + '"]');
    if (key) key.classList.add('is-picked');
  }

  function setDraft(text) {
    if (!draft) return;
    draft.textContent = text || IDLE;
    draft.classList.toggle('is-typing', !!text);
    if (input) input.classList.toggle('is-live', !!text);
  }

  function stopRec() {
    if (input) input.classList.remove('is-rec');
  }

  // Holds the mic down, counts up, then lets go. The clock runs faster than
  // real time: nobody wants to watch nine actual seconds of a timer.
  function recordThen(seconds, after) {
    if (!rec || !recTime) { after(); return; }
    if (input) input.classList.add('is-rec');
    var n = 0;
    (function tick() {
      recTime.textContent = '0:' + (n < 10 ? '0' : '') + n;
      if (n >= seconds) { wait(420, function () { stopRec(); after(); }); return; }
      n++;
      wait(300, tick);
    })();
  }

  function reveal(el) {
    el.classList.add('is-in');
    var p = +el.getAttribute('data-phase');
    if (p) setPhase(p);
    var prev = steps[steps.indexOf(el) - 1];
    if (prev && prev.hasAttribute('data-typing')) prev.classList.remove('is-in');
  }

  function run() {
    if (at >= steps.length) { finish(); return; }
    var el = steps[at++];
    var gap = +el.getAttribute('data-wait');
    if (isNaN(gap)) gap = 700;

    wait(gap, function () {
      var secs = +el.getAttribute('data-record');
      if (secs) {
        recordThen(secs, function () { reveal(el); run(); });
        return;
      }
      // The button lights a beat before the reply lands, the way a tap
      // and its message are a beat apart.
      if (el.hasAttribute('data-tap')) {
        tap(el);
        wait(260, function () { reveal(el); run(); });
        return;
      }
      reveal(el);
      run();
    });
  }

  function finish() {
    stopRec();
    setDraft('');
  }

  function reset() {
    clear();
    at = 0;
    steps.forEach(function (el) { el.classList.remove('is-in'); });
    section.querySelectorAll('.tg-key').forEach(function (k) { k.classList.remove('is-picked'); });
    stopRec();
    setDraft('');
    setPhase(0);
  }

  if (replay) replay.addEventListener('click', function () { reset(); run(); });

  // Starts once, when the phone first comes into view. Rewinding it because
  // the viewport moved threw away a conversation somebody was watching.
  var io = new IntersectionObserver(function (entries, obs) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    obs.disconnect();
    run();
  }, { threshold: 0.35 });

  io.observe(phone);
})();
