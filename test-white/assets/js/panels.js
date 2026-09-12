/* ---------------------------------------------------------------
   Offerings / Product rows.

   Click to open, one at a time, identically on desktop, tablet and
   phone. Nothing starts open, and the animation runs on every open
   rather than only the first.
   --------------------------------------------------------------- */
(function () {
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-panel]'));
  if (!panels.length) return;

  function set(panel, open) {
    panel.classList.toggle('is-open', open);
    panel.querySelector('.pan-head').setAttribute('aria-expanded', String(open));
  }

  // Offerings and the questions are separate groups: opening a question
  // should not shut an offering you were reading further up.
  function siblings(panel) {
    var faq = panel.classList.contains('faq-panel');
    return panels.filter(function (p) { return p.classList.contains('faq-panel') === faq; });
  }

  panels.forEach(function (panel) {
    set(panel, false);
    panel.querySelector('.pan-head').addEventListener('click', function () {
      var wasOpen = panel.classList.contains('is-open');
      siblings(panel).forEach(function (p) { set(p, false); });
      if (wasOpen) return;

      // Restart the stagger so the detail animates every time, not just once.
      var detail = panel.querySelector('.pan-detail');
      detail.classList.remove('is-in');
      void detail.offsetWidth;          // forces the browser to notice the reset
      set(panel, true);
      requestAnimationFrame(function () { detail.classList.add('is-in'); });
    });
  });
})();
