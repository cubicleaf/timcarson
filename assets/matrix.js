/* Dot matrix for Tim's site (mockup, 2026-11-17).
   The same moving wave field as Carson Clean's matrix (plane waves, copied from assets/bio-edge.js),
   painted into any element with data-matrix="hero|edge-top|edge-bottom|door|footer".
   Every canvas uses one page-wide grid (19px), so the dots line up from section to section.
   Decorative only: aria-hidden, no pointer events, paused off-screen, one still frame under reduced motion. */
(function () {
  'use strict';
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HOVER = matchMedia('(hover: hover)').matches;
  var D = 19, GOLD = [226, 188, 108], CREAM = [243, 231, 214];
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* wave field: identical recipe and seed to Carson Clean's, so the motion feels the same */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var R = mulberry(20261111), rand = function (a, b) { return a + R() * (b - a); };
  var WAVES = [], AMP = 0;
  for (var i = 0; i < 8; i++) { var wl = rand(180, 720); WAVES.push({ k: Math.PI * 2 / wl, omega: (38 * (Math.PI * 2 / wl)) * rand(.55, 1.9) * (R() < .5 ? -1 : 1), phase: rand(0, Math.PI * 2), amp: rand(.5, 1.4), angVel: rand(-.025, .025), angle: rand(0, Math.PI * 2) }); }
  WAVES.forEach(function (w) { AMP += w.amp; });
  function field(x, y, t) { var m = 0; for (var i = 0; i < WAVES.length; i++) { var w = WAVES[i]; m += Math.sin(w.k * (Math.cos(w.angle) * x + Math.sin(w.angle) * y) + w.omega * t + w.phase) * w.amp; } return m / AMP; }
  /* The cream band's edge: three long, slow waves along x only (wavelengths about 0.9, 1.5 and 2.4 thousand px),
     so the shoreline is a few broad, unhurried curves that never repeat in an obvious rhythm. Tim, 2026-11-17. */
  var SHORE = [];
  for (var s2 = 0; s2 < 3; s2++) SHORE.push({ k: Math.PI * 2 / [900, 1500, 2400][s2] / rand(.85, 1.15), w: rand(.05, .11) * (R() < .5 ? -1 : 1), ph: rand(0, Math.PI * 2), a: [1, .7, .5][s2] });
  function shore(x, t, side) { var m = 0; for (var i = 0; i < 3; i++) { var q = SHORE[i]; m += Math.sin(q.k * x + q.w * t + q.ph + side * 2.1) * q.a; } return m / 2.2; }
  var mag = function (v) { return Math.pow(clamp((clamp(v, -1, 1) + 1) * .5, 0, 1), 1.7); };

  var layers = [];
  var pointer = { x: -1e4, y: -1e4 };
  if (HOVER) addEventListener('pointermove', function (e) { pointer.x = e.pageX; pointer.y = e.pageY; }, { passive: true });

  function Layer(el) {
    this.el = el; this.mode = el.getAttribute('data-matrix');
    var c = document.createElement('canvas'); c.className = 'mx mx-' + this.mode; c.setAttribute('aria-hidden', 'true');
    el.insertBefore(c, el.firstChild); this.c = c; this.ctx = c.getContext('2d'); this.visible = false;
    var self = this;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; }, { rootMargin: '80px' }).observe(c);
    else this.visible = true;
  }
  Layer.prototype.layout = function () {
    var r = this.c.getBoundingClientRect(), Q = Math.min(devicePixelRatio || 1, 1.5);
    this.W = r.width; this.H = r.height; this.X = r.left + scrollX; this.Y = r.top + scrollY; this.Q = Q;
    this.c.width = Math.round(this.W * Q); this.c.height = Math.round(this.H * Q);
    var dots = [], x0 = Math.ceil((this.X - 5) / D) * D + 5, y0 = Math.ceil((this.Y - 5) / D) * D + 5;
    for (var y = y0; y < this.Y + this.H + D; y += D) for (var x = x0; x < this.X + this.W + D; x += D) dots.push([x, y]);
    this.dots = dots;
  };
  Layer.prototype.draw = function (t) {
    var ctx = this.ctx, W = this.W, H = this.H, X = this.X, Y = this.Y, m = this.mode, narrow = innerWidth < 761;
    ctx.setTransform(this.Q, 0, 0, this.Q, -X * this.Q, -Y * this.Q); ctx.clearRect(X, Y, W, H);
    if (m === 'edge-top' || m === 'edge-bottom') { ctx.fillStyle = 'rgb(' + CREAM.join(',') + ')'; ctx.fillRect(X, m === 'edge-top' ? Y + H - 6 : Y, W, 6); }
    for (var i = 0; i < this.dots.length; i++) {
      var x = this.dots[i][0], y = this.dots[i][1], u = (x - X) / W, v = (y - Y) / H, f = field(x, y, t), g = mag(2.2 * f), r, a, col = GOLD;
      if (m === 'hero') {            /* 1: quiet on the left where the words are, fuller toward the right and the bottom */
        var keep = narrow ? smooth(.45, 1, v) : .12 + .88 * smooth(.4, .95, u) * (.55 + .45 * smooth(0, .8, v));
        r = .8 + 4.6 * g; a = (.04 + .5 * g) * keep;
      } else if (m === 'edge-top' || m === 'edge-bottom') {   /* 2: the cream band's edge dissolves into cream dots */
        var near = m === 'edge-top' ? v : 1 - v;              /* 1 at the cream, 0 away from it */
        /* the long shoreline waves decide how far the cream reaches; dots grow toward it and merge */
        var reach = near + .42 * shore(x, t, m === 'edge-top' ? 0 : 1) + .05 * f;
        r = D * .8 * smooth(.12, .95, reach) * smooth(0, .3, near); a = 1; col = CREAM;   /* never a hard cut at the strip's outer edge */
      } else if (m === 'door') {      /* 3: faint at rest; dots swell under the pointer */
        var d = Math.hypot(x - pointer.x, y - pointer.y), lift = HOVER ? 1 - smooth(0, 150, d) : .35 * g;
        r = 1 + 2.2 * g + 4 * lift; a = .07 + .16 * g + .45 * lift;
      } else {                        /* 4: footer: the matrix gathers toward the bottom of the page */
        r = .8 + 5 * g * v; a = (.03 + .55 * g) * smooth(0, 1, v);
      }
      if (r < .45 || a < .01) continue;
      ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + clamp(a, 0, 1).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  };

  function layoutAll() { layers.forEach(function (l) { l.layout(); l.draw(T); }); }
  var T = 3, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var gap = innerWidth < 761 ? 40 : 16; if (now - last < gap) return;
    var dt = Math.min(.05, (now - last) / 1000) * 1.15; last = now; T += dt;
    for (var i = 0; i < WAVES.length; i++) WAVES[i].angle += WAVES[i].angVel * dt;
    layers.forEach(function (l) { if (l.visible) l.draw(T); });
  }
  function init() {
    document.querySelectorAll('[data-matrix]').forEach(function (el) { layers.push(new Layer(el)); });
    layoutAll();
    var to = 0; addEventListener('resize', function () { clearTimeout(to); to = setTimeout(layoutAll, 180); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutAll);
    setTimeout(layoutAll, 900);   /* after images settle the page height */
    if (!REDUCED) requestAnimationFrame(function (n) { last = n; requestAnimationFrame(frame); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
