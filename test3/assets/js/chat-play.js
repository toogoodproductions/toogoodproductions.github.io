/* ---------------------------------------------------------------
   The product's Telegram thread, which you drive.

   This was tied to the scrollbar once: the phone pinned, a message per
   so many pixels moved. It stuttered, because a conversation does not
   happen in scroll distance. Then it played itself, which was smooth
   but was a recording, and a recording cannot answer the only question
   a founder has, which is whether this is actually easy.

   So the buttons are real. A visitor taps the same four a founder
   would, types their own line if they want to, and gets the same film
   back. Four taps and about twenty seconds. That is the argument.

   The whole transcript sits in the markup in order, so a crawler or a
   reader without JavaScript gets the conversation as a document. This
   hides it and hands it back a turn at a time.
   --------------------------------------------------------------- */
(function () {
  var section = document.querySelector('[data-chat-play]');
  if (!section) return;

  var phone = section.querySelector('.phone');
  var log = section.querySelector('.tg-log');
  var form = section.querySelector('[data-chat-form]');
  var input = form && form.querySelector('input');
  var send = form && form.querySelector('.tg-send');
  var replay = section.querySelector('[data-chat-replay]');
  var steps = Array.prototype.slice.call(section.querySelectorAll('.chat-step'));
  var marks = Array.prototype.slice.call(section.querySelectorAll('[data-phase-item]'));
  if (!phone || !log || !steps.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    setPhase(4);
    return;
  }

  var at = 0;
  var timer = null;
  var armed = null;          // the keyboard, or the input, we are waiting on
  var answers = {};

  function reveal(el) {
    el.classList.add('is-in');
    var p = +el.getAttribute('data-phase');
    if (p) setPhase(p);
    // A typing bubble is only true until the message it stood in for lands.
    var prev = steps[steps.indexOf(el) - 1];
    if (prev && prev.hasAttribute('data-typing')) prev.classList.remove('is-in');
  }

  function lockInput() {
    if (!input) return;
    input.disabled = true;
    send.disabled = true;
    input.value = '';
    input.placeholder = 'Message';
    form.classList.remove('is-live');
  }

  function armKeys(el, name) {
    var keys = section.querySelector('[data-keys="' + name + '"]');
    if (!keys) { advance(el, ''); return; }
    keys.classList.add('is-waiting');
    armed = { type: 'keys', el: el, keys: keys };
  }

  function armText(el) {
    if (!input) { advance(el, ''); return; }
    input.disabled = false;
    send.disabled = false;
    input.placeholder = 'Type your take, or just hit send';
    form.classList.add('is-live');
    armed = { type: 'text', el: el };
  }

  // Fills the outgoing bubble with what the visitor actually chose, so the
  // thread is theirs rather than a script they watched.
  function advance(el, value) {
    armed = null;
    if (value) {
      var fill = el.querySelector('[data-fill]');
      if (fill) fill.textContent = value;
    }
    reveal(el);
    at = steps.indexOf(el) + 1;
    run();
  }

  function run() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (at >= steps.length) { finish(); return; }

    var el = steps[at];
    var await_ = el.getAttribute('data-await');

    if (await_ === 'text') { armText(el); return; }
    if (await_) { armKeys(el, await_); return; }

    var wait = +el.getAttribute('data-wait');
    if (isNaN(wait)) wait = 700;
    timer = setTimeout(function () {
      reveal(el);
      at++;
      run();
    }, wait);
  }

  function finish() {
    lockInput();
    if (replay) replay.hidden = false;
  }

  function reset() {
    if (timer) { clearTimeout(timer); timer = null; }
    armed = null;
    at = 0;
    answers = {};
    steps.forEach(function (el) { el.classList.remove('is-in'); });
    section.querySelectorAll('.tg-keys').forEach(function (k) {
      k.classList.remove('is-waiting');
      k.querySelectorAll('.tg-key').forEach(function (b) { b.classList.remove('is-picked'); });
    });
    section.querySelectorAll('[data-fill]').forEach(function (f) {
      if (f.dataset.original) f.textContent = f.dataset.original;
    });
    lockInput();
    if (replay) replay.hidden = true;
    setPhase(0);
  }

  // Remember the written-in answers so a replay starts clean.
  section.querySelectorAll('[data-fill]').forEach(function (f) {
    f.dataset.original = f.textContent;
  });

  log.addEventListener('click', function (e) {
    var key = e.target.closest('.tg-key');
    if (!key || !armed || armed.type !== 'keys') return;
    if (!armed.keys.contains(key)) return;
    armed.keys.classList.remove('is-waiting');
    armed.keys.querySelectorAll('.tg-key').forEach(function (b) { b.classList.remove('is-picked'); });
    key.classList.add('is-picked');
    var v = key.getAttribute('data-value') || key.textContent.trim();
    answers[armed.el.getAttribute('data-await')] = v;
    // "Posted to LinkedIn" should say wherever they actually sent it.
    if (armed.el.getAttribute('data-await') === 'where') {
      section.querySelectorAll('[data-fill-where]').forEach(function (n) { n.textContent = v; });
    }
    advance(armed.el, v);
  });

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!armed || armed.type !== 'text') return;
      var v = input.value.trim();
      lockInput();
      advance(armed.el, v);      // empty keeps the line already written there
    });
  }

  if (replay) replay.addEventListener('click', function () { reset(); run(); });

  // Starts once, when the phone first comes into view, and is then left
  // alone. Rewinding it because the viewport moved threw away a
  // conversation somebody was halfway through, which is the opposite of
  // what this is for. Running it again is a button.
  var io = new IntersectionObserver(function (entries, obs) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    obs.disconnect();
    run();
  }, { threshold: 0.35 });

  io.observe(phone);
})();
