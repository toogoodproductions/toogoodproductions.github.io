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

    // build: particles stream in from the left and assemble a frame
    for (i = 0; i < 80; i++) {
      p = { r: rnd(.8, 1.9), sp: rnd(.35, 1.1) };
      this.reset(p, true);
      this.parts.push(p);
    }
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

    // build
    var fx = this.w * .62, fy = this.h * .5;
    var fw = Math.min(this.w * .26, 92), fh = fw * 16 / 9;

    for (i = 0; i < this.parts.length; i++) {
      p = this.parts[i];
      p.x += p.sp;
      p.y += (p.ty - p.y) * .012;
      if (p.x > fx - fw / 2) { this.reset(p); continue; }
      var fade = Math.min(1, (fx - fw / 2 - p.x) / 40);
      x.fillStyle = 'rgba(255,255,255,' + (.5 * fade + .15).toFixed(3) + ')';
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill();
    }

    var pulse = .5 + Math.sin(this.t * 1.8) * .5;
    x.strokeStyle = 'rgba(255,255,255,' + (.35 + pulse * .4).toFixed(3) + ')';
    x.lineWidth = 1.3;
    x.beginPath();
    if (x.roundRect) x.roundRect(fx - fw / 2, fy - fh / 2, fw, fh, 10);
    else x.rect(fx - fw / 2, fy - fh / 2, fw, fh);
    x.stroke();

    x.fillStyle = 'rgba(255,255,255,' + (.55 + pulse * .35).toFixed(3) + ')';
    x.beginPath();
    x.moveTo(fx - 6, fy - 9); x.lineTo(fx + 9, fy); x.lineTo(fx - 6, fy + 9);
    x.closePath(); x.fill();
    return;
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
