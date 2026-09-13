/* ---------------------------------------------------------------
   The four drawings, alive.

   These were thin-line SVG icons that sat there. Icons sit there;
   that is what icons are for, and it is why the page read as static.
   So each step is a canvas running a small particle system instead,
   and all four share one engine so the section looks like one thing
   rather than four clip-art choices.

   Only the panel in front of you runs. The rest are stopped, so the
   page is never burning frames on something nobody is looking at.
   --------------------------------------------------------------- */
(function () {
  var HOSTS = Array.prototype.slice.call(document.querySelectorAll('[data-art]'));
  if (!HOSTS.length || !window.requestAnimationFrame) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A brain, as an outline. Particles are sampled inside it, so the shape
  // is made of the moving dots rather than drawn around them.
  var BRAIN = 'M100 26c-22 0-38 10-44 24-16 0-26 12-24 26-10 8-10 24 0 32-2 14 6 26 20 28 4 14 18 22 34 18 6 10 22 10 28 0 16 4 30-4 34-18 14-2 22-14 20-28 10-8 10-24 0-32 2-14-8-26-24-26-6-14-24-24-44-24z';

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function Field(canvas, mode) {
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.mode = mode;
    this.t = 0;
    this.running = false;
    this.parts = [];
    this.size();
  }

  Field.prototype.size = function () {
    var r = this.c.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.c.width = this.w * dpr;
    this.c.height = this.h * dpr;
    this.x.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed();
  };

  Field.prototype.seed = function () {
    var n, i, p;
    this.parts = [];

    if (this.mode === 'mind' || this.mode === 'forever') {
      // Sample inside the brain outline so the cloud of dots is the shape.
      var s = Math.min(this.w, this.h) / 200;
      var ox = (this.w - 200 * s) / 2, oy = (this.h - 200 * s) / 2;
      this.path = new Path2D();
      var m = new DOMMatrix().translate(ox, oy).scale(s);
      this.path.addPath(new Path2D(BRAIN), m);
      this.pathScale = s; this.ox = ox; this.oy = oy;

      n = this.mode === 'forever' ? 90 : 120;
      var guard = 0;
      while (this.parts.length < n && guard < n * 200) {
        guard++;
        var px = rnd(ox, ox + 200 * s), py = rnd(oy, oy + 200 * s);
        if (!this.x.isPointInPath(this.path, px, py)) continue;
        this.parts.push({ x: px, y: py, hx: px, hy: py, vx: rnd(-.12, .12), vy: rnd(-.12, .12), r: rnd(.9, 2.1), a: rnd(.25, .9), ph: Math.random() * 6.28 });
      }
      return;
    }

    if (this.mode === 'watch') {
      for (i = 0; i < 70; i++) {
        this.parts.push({ x: rnd(0, this.w), y: rnd(0, this.h), r: rnd(1, 2.4), lit: 0, ph: Math.random() * 6.28 });
      }
      return;
    }

    // build draws itself from the clock, so it holds no particles
  };

  Field.prototype.reset = function (p, first) {
    p.x = first ? rnd(-this.w * .2, this.w * .55) : rnd(-this.w * .25, -4);
    p.y = rnd(this.h * .08, this.h * .92);
    p.ty = this.h / 2 + rnd(-this.h * .18, this.h * .18);
  };

  Field.prototype.frame = function () {
    var x = this.x, i, j, p, q, d;
    x.clearRect(0, 0, this.w, this.h);
    this.t += 1 / 60;

    if (this.mode === 'mind' || this.mode === 'forever') {
      var breathe = this.mode === 'forever' ? 1 + Math.sin(this.t * .7) * .04 : 1;

      // the outline, faint, so the shape stays legible while the dots drift
      x.save();
      x.translate(this.w / 2, this.h / 2);
      x.scale(breathe, breathe);
      x.translate(-this.w / 2, -this.h / 2);
      x.strokeStyle = 'rgba(255,255,255,.14)';
      x.lineWidth = 1;
      x.stroke(this.path);
      x.restore();

      for (i = 0; i < this.parts.length; i++) {
        p = this.parts[i];
        p.x += p.vx; p.y += p.vy;
        // tethered to where it was born, so the cloud keeps the brain shape
        var dx = p.x - p.hx, dy = p.y - p.hy;
        if (dx * dx + dy * dy > 260) { p.vx -= dx * .004; p.vy -= dy * .004; }
        p.vx *= .995; p.vy *= .995;
      }

      // synapses: a line between near neighbours, brighter the closer they are
      x.lineWidth = .7;
      for (i = 0; i < this.parts.length; i++) {
        for (j = i + 1; j < this.parts.length; j++) {
          p = this.parts[i]; q = this.parts[j];
          d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d > 34) continue;
          x.strokeStyle = 'rgba(255,255,255,' + (.3 * (1 - d / 34)).toFixed(3) + ')';
          x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); x.stroke();
        }
      }

      // a charge running the width of it, endlessly on step four
      var fire = (this.t * .55) % 1;
      for (i = 0; i < this.parts.length; i++) {
        p = this.parts[i];
        var here = (p.x - this.ox) / (200 * this.pathScale);
        var near = 1 - Math.min(1, Math.abs(here - fire) * 7);
        var a = p.a * (.55 + Math.sin(this.t * 2 + p.ph) * .18) + near * .9;
        x.fillStyle = 'rgba(255,255,255,' + Math.min(1, a).toFixed(3) + ')';
        x.beginPath(); x.arc(p.x, p.y, p.r + near * 1.3, 0, 6.283); x.fill();
      }
      return;
    }

    if (this.mode === 'watch') {
      var cx = this.w / 2, cy = this.h / 2;
      var R = Math.min(this.w, this.h) * .46;
      var ang = (this.t * .55) % 6.283;

      x.strokeStyle = 'rgba(255,255,255,.12)';
      x.lineWidth = 1;
      for (i = 1; i <= 3; i++) { x.beginPath(); x.arc(cx, cy, R * i / 3, 0, 6.283); x.stroke(); }
      x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();

      // the sweep, as a fading wedge behind the leading edge
      var g = x.createConicGradient ? x.createConicGradient(ang, cx, cy) : null;
      if (g) {
        g.addColorStop(0, 'rgba(255,255,255,.20)');
        g.addColorStop(.12, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.beginPath(); x.arc(cx, cy, R, 0, 6.283); x.fill();
      }
      x.strokeStyle = 'rgba(255,255,255,.75)';
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); x.stroke();

      for (i = 0; i < this.parts.length; i++) {
        p = this.parts[i];
        var pa = Math.atan2(p.y - cy, p.x - cx);
        var diff = ((ang - pa) % 6.283 + 6.283) % 6.283;
        if (diff < .08) p.lit = 1;                 // the sweep just passed it
        p.lit *= .988;
        var inside = Math.hypot(p.x - cx, p.y - cy) < R;
        if (!inside) continue;
        x.fillStyle = 'rgba(255,255,255,' + (.08 + p.lit * .85).toFixed(3) + ')';
        x.beginPath(); x.arc(p.x, p.y, p.r + p.lit * 1.6, 0, 6.283); x.fill();
      }
      return;
    }

    if (this.mode === 'whole') {
      // The three steps, complete, with work still moving between them. The
      // closing panel used to be three numbered dots, which said nothing
      // that the steps beside them had not already said.
      var N = 3, R2 = Math.min(this.w, this.h) * .3;
      var ccx = this.w / 2, ccy = this.h / 2;
      var spin = this.t * .5;

      x.strokeStyle = 'rgba(255,255,255,.16)';
      x.lineWidth = 1;
      x.beginPath(); x.arc(ccx, ccy, R2, 0, 6.283); x.stroke();

      for (i = 0; i < N; i++) {
        var a2 = spin + i * 6.283 / N;
        var nx = ccx + Math.cos(a2) * R2, ny = ccy + Math.sin(a2) * R2;
        x.strokeStyle = 'rgba(255,255,255,.7)';
        x.lineWidth = 1.2;
        x.beginPath(); x.arc(nx, ny, 15, 0, 6.283); x.stroke();
        x.fillStyle = 'rgba(255,255,255,.1)';
        x.beginPath(); x.arc(nx, ny, 15, 0, 6.283); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.9)';
        x.beginPath(); x.moveTo(nx - 4, ny + 0); x.lineTo(nx - 1, ny + 4); x.lineTo(nx + 5, ny - 4); x.stroke();
      }

      // the work, going round and never arriving anywhere final
      for (i = 0; i < 3; i++) {
        var ta = spin * 2.2 + i * 2.1;
        var tx2 = ccx + Math.cos(ta) * R2, ty2 = ccy + Math.sin(ta) * R2;
        x.fillStyle = 'rgba(255,255,255,' + (.85 - i * .22).toFixed(2) + ')';
        x.beginPath(); x.arc(tx2, ty2, 3.4 - i * .7, 0, 6.283); x.fill();
      }
      return;
    }

    // build: script, video, edit, and then the thing itself. Three stages
    // rather than four, because the angle is already decided by the time
    // this step starts, and a chain that ends in a rectangle labelled CUT
    // ends on a noun nobody buys. It ends on the video.
    var W = this.w, H = this.h;
    var fw = Math.min(W * .20, 74), fh = fw * 16 / 9;
    var fx = W * .80, fy = H * .5;                 // the finished video
    var xs = [W * .16, W * .36, W * .56];          // the three stages
    var ry = H * .5;
    var names = ['SCRIPT', 'VIDEO', 'EDIT'];

    var cycle = 5.0;
    var u = (this.t % cycle) / cycle;              // 0..1, one pass
    var stageSpan = 0.76;                          // the rest is spent inside the frame
    var head = Math.min(1, u / stageSpan) * (xs.length - 1);
    var arrived = u > stageSpan;
    var settle = arrived ? Math.min(1, (u - stageSpan) / (1 - stageSpan)) : 0;

    var hx = arrived
      ? xs[2] + (fx - fw / 2 - xs[2]) * Math.min(1, settle * 2.2)
      : xs[0] + (xs[2] - xs[0]) * (head / (xs.length - 1));

    // the rail, and how much of it has been travelled
    x.strokeStyle = 'rgba(255,255,255,.14)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(xs[0], ry); x.lineTo(fx - fw / 2, ry); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.55)';
    x.beginPath(); x.moveTo(xs[0], ry); x.lineTo(hx, ry); x.stroke();

    for (i = 0; i < xs.length; i++) {
      var sx = xs[i];
      var done = arrived || head >= i - .02;
      var hot = arrived ? 0 : Math.max(0, 1 - Math.abs(head - i) * 2.2);
      var rr = 15 + hot * 5;

      if (hot > 0) {
        x.fillStyle = 'rgba(255,255,255,' + (hot * .14).toFixed(3) + ')';
        x.beginPath(); x.arc(sx, ry, rr + hot * 14, 0, 6.283); x.fill();
      }
      x.strokeStyle = 'rgba(255,255,255,' + (done ? .85 : .28) + ')';
      x.lineWidth = 1.2;
      x.beginPath(); x.arc(sx, ry, rr, 0, 6.283); x.stroke();

      x.strokeStyle = 'rgba(255,255,255,' + (done ? .92 : .34) + ')';
      x.lineWidth = 1.1;
      x.beginPath();
      if (i === 0) {                    // lines of script
        x.moveTo(sx - 6, ry - 4); x.lineTo(sx + 6, ry - 4);
        x.moveTo(sx - 6, ry); x.lineTo(sx + 4, ry);
        x.moveTo(sx - 6, ry + 4); x.lineTo(sx + 1, ry + 4);
      } else if (i === 1) {             // a frame with a play mark
        x.rect(sx - 7, ry - 5, 14, 10);
        x.moveTo(sx - 2, ry - 3); x.lineTo(sx + 3, ry); x.lineTo(sx - 2, ry + 3);
      } else {                          // a cut between two shots
        x.moveTo(sx - 7, ry - 5); x.lineTo(sx - 1, ry - 5); x.lineTo(sx - 1, ry + 5); x.lineTo(sx - 7, ry + 5); x.closePath();
        x.moveTo(sx + 1, ry - 5); x.lineTo(sx + 7, ry - 5); x.lineTo(sx + 7, ry + 5); x.lineTo(sx + 1, ry + 5); x.closePath();
      }
      x.stroke();

      x.fillStyle = 'rgba(255,255,255,' + (done ? .7 : .26) + ')';
      x.font = '9px ui-monospace, Menlo, monospace';
      x.textAlign = 'center';
      x.fillText(names[i], sx, ry + 36);
    }

    // the work in transit, with a short trail so the direction is obvious
    if (!arrived || settle < 1) {
      for (i = 5; i >= 1; i--) {
        var tx = hx - i * 7;
        if (tx < xs[0]) continue;
        x.fillStyle = 'rgba(255,255,255,' + (.26 - i * .04).toFixed(3) + ')';
        x.beginPath(); x.arc(tx, ry, 2.1 - i * .22, 0, 6.283); x.fill();
      }
      x.fillStyle = 'rgba(255,255,255,.16)';
      x.beginPath(); x.arc(hx, ry, 10, 0, 6.283); x.fill();
      x.fillStyle = '#fff';
      x.beginPath(); x.arc(hx, ry, 3.4, 0, 6.283); x.fill();
    }

    // the video, which fills as the work lands in it
    var fill = settle;
    x.save();
    x.strokeStyle = 'rgba(255,255,255,' + (.22 + fill * .68).toFixed(3) + ')';
    x.lineWidth = 1.4;
    x.beginPath();
    if (x.roundRect) x.roundRect(fx - fw / 2, fy - fh / 2, fw, fh, 9);
    else x.rect(fx - fw / 2, fy - fh / 2, fw, fh);
    x.stroke();

    if (fill > 0) {
      x.save();
      x.beginPath();
      if (x.roundRect) x.roundRect(fx - fw / 2, fy - fh / 2, fw, fh, 9);
      else x.rect(fx - fw / 2, fy - fh / 2, fw, fh);
      x.clip();
      // it fills from the bottom, the way a render completes
      x.fillStyle = 'rgba(255,255,255,.10)';
      x.fillRect(fx - fw / 2, fy + fh / 2 - fh * fill, fw, fh * fill);
      x.restore();
    }

    if (fill > .45) {
      var pa = Math.min(1, (fill - .45) / .3);
      x.fillStyle = 'rgba(255,255,255,' + (pa * .92).toFixed(3) + ')';
      x.beginPath();
      x.moveTo(fx - 5, fy - 8); x.lineTo(fx + 8, fy); x.lineTo(fx - 5, fy + 8);
      x.closePath(); x.fill();
      // captions, because that is what comes out
      x.fillStyle = 'rgba(255,255,255,' + (pa * .45).toFixed(3) + ')';
      x.fillRect(fx - fw * .3, fy + fh * .3, fw * .6, 2.5);
      x.fillRect(fx - fw * .2, fy + fh * .3 + 6, fw * .4, 2.5);
    }
    x.restore();
  };

  Field.prototype.tick = function () {
    if (!this.running) return;
    this.frame();
    var self = this;
    this.raf = requestAnimationFrame(function () { self.tick(); });
  };

  Field.prototype.play = function () {
    if (this.running) return;
    this.running = true;
    this.tick();
  };

  Field.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  };

  var fields = HOSTS.map(function (host) {
    var canvas = document.createElement('canvas');
    canvas.className = 'art-canvas';
    host.appendChild(canvas);
    return new Field(canvas, host.getAttribute('data-art'));
  });

  if (reduced) { fields.forEach(function (f) { f.frame(); }); return; }

  // The page tells us which panel is in front; until then, run the first.
  window.__journeyArt = {
    show: function (i) {
      fields.forEach(function (f, n) { if (n === i) f.play(); else f.stop(); });
    },
    all: function () { fields.forEach(function (f) { f.play(); }); }
  };

  fields[0].play();

  var w = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === w) return;
    w = window.innerWidth;
    fields.forEach(function (f) { f.size(); });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) fields.forEach(function (f) { f.stop(); });
  });
})();
