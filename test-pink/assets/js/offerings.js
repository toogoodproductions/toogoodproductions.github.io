/* ---------------------------------------------------------------
   Offerings index.

   One row open at a time. Where there is a real pointer the row
   under the cursor opens; on touch, tapping toggles. Either way the
   page stays a short list until you ask for detail.
   --------------------------------------------------------------- */
(function () {
  var rows = Array.prototype.slice.call(document.querySelectorAll('[data-offer]'));
  if (!rows.length) return;

  var fine = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

  // On a phone the first row being open makes the page look long before you
  // have asked it anything. Start closed there; on desktop the hover takes
  // over the moment the pointer arrives anyway.
  if (!fine || (window.matchMedia && window.matchMedia('(max-width: 720px)').matches)) {
    rows.forEach(function (r) {
      r.classList.remove('is-open');
      r.querySelector('.offer-head').setAttribute('aria-expanded', 'false');
    });
  }

  function open(row) {
    rows.forEach(function (r) {
      var on = r === row;
      r.classList.toggle('is-open', on);
      r.querySelector('.offer-head').setAttribute('aria-expanded', String(on));
    });
  }

  rows.forEach(function (row) {
    var head = row.querySelector('.offer-head');

    // Tapping always works, which also covers keyboard: a button fires
    // click on Enter and Space.
    head.addEventListener('click', function () {
      if (row.classList.contains('is-open') && !fine) open(null);
      else open(row);
    });

    if (fine) {
      row.addEventListener('mouseenter', function () { open(row); });
      head.addEventListener('focus', function () { open(row); });
    }
  });
})();
