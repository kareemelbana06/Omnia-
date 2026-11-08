(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var card = $('card'), heading = $('heading'), lead = $('lead'), actions = $('actions');
  var yes = $('yes'), no = $('no'), slot = $('noSlot'), success = $('success');
  var field = $('field'), root = document.body;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  var HEART_COLORS = ['#ff8fb8', '#ffb3d1', '#f06aa0', '#c9b3ff', '#b79cff', '#ffc9de'];

  function buildHearts() {
    var count = window.innerWidth < 640 ? 16 : 28;
    var html = '';
    for (var i = 0; i < count; i++) {
      var size = rand(14, 44);
      var dur = rand(10, 20);
      var style =
        '--x:' + rand(-2, 98).toFixed(1) + '%;' +
        '--s:' + size.toFixed(0) + 'px;' +
        '--c:' + HEART_COLORS[i % HEART_COLORS.length] + ';' +
        '--o:' + rand(0.28, 0.7).toFixed(2) + ';' +
        '--d:' + dur.toFixed(1) + 's;' +
        '--delay:-' + rand(0, dur).toFixed(1) + 's;' +
        '--dx:' + rand(-50, 50).toFixed(0) + 'px;' +
        '--r0:' + rand(-25, 25).toFixed(0) + 'deg;' +
        '--r1:' + rand(-35, 35).toFixed(0) + 'deg;' +
        '--b:' + rand(2, 95).toFixed(0) + '%;';
      html += '<svg class="heart" style="' + style + '" viewBox="0 0 24 24"><use href="#h"/></svg>';
    }
    field.innerHTML = html;
  }
  buildHearts();
  var M = 18;            
  var NEAR = 110;      
  var SAFE = 220;        
  var done = false;
  var escaped = false;
  var cur = { x: 0, y: 0 };
  var pointer = null;
  var lastMove = 0;

  function viewport() {
    return { w: document.documentElement.clientWidth || window.innerWidth, h: window.innerHeight };
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function distToRect(p, r) {
    var dx = Math.max(r.left - p.x, 0, p.x - r.right);
    var dy = Math.max(r.top - p.y, 0, p.y - r.bottom);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function overlapArea(a, b) {
    var w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    var h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  }
  function grow(r, n) { return { left: r.left - n, top: r.top - n, right: r.right + n, bottom: r.bottom + n }; }
  function startEscape() {
    var r = no.getBoundingClientRect();
    slot.style.width = r.width + 'px';
    slot.style.height = r.height + 'px';
    no.style.transition = 'none';
    root.appendChild(no);
    no.classList.add('escaped');
    no.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px)';
    cur = { x: r.left, y: r.top };
    void no.offsetWidth;
    no.style.transition = '';
    escaped = true;
  }
  function pickPosition() {
    var v = viewport();
    var bw = no.offsetWidth, bh = no.offsetHeight;
    var maxX = Math.max(M, v.w - bw - M);
    var maxY = Math.max(M, v.h - bh - M);
    var cardR = card.getBoundingClientRect();
    var yesR = grow(yes.getBoundingClientRect(), 18);
    var area = bw * bh;
    var big = Math.max(v.w, v.h) * 0.5;
    var best = { x: M, y: M }, bestScore = -Infinity;

    for (var i = 0; i < 90; i++) {
      var x = rand(M, maxX), y = rand(M, maxY);
      var r = { left: x, top: y, right: x + bw, bottom: y + bh };
      var travel = Math.hypot(x - cur.x, y - cur.y);
      var s = Math.min(travel, big) / big * 30;
      if (travel < Math.min(v.w, v.h) * 0.3) s -= 120;
      s -= overlapArea(r, yesR) / area * 400;
      s -= overlapArea(r, cardR) / area * 70;
      if (pointer) {
        var d = distToRect(pointer, r);
        s += d < SAFE ? -1000 : Math.min(d, 500) / 500 * 10;
      }
      s += Math.random() * 5;
      if (s > bestScore) { bestScore = s; best = { x: x, y: y }; }
    }
    return best;
  }
  function flee(kind) {
    if (done) return;
    var now = performance.now();
    if (kind === 'mouse' && now - lastMove < 80) return;
    lastMove = now;
    if (!escaped) startEscape();
    var p = pickPosition();
    no.style.setProperty('--fly', reduceMotion ? '0s' : (kind === 'touch' ? '0.6s' : '0.2s'));
    no.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
    no.style.rotate = rand(-10, 10).toFixed(1) + 'deg';
    cur = p;
  }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    pointer = { x: e.clientX, y: e.clientY };
    if (done) return;
    var rect;
    if (escaped) {
      rect = { left: cur.x, top: cur.y, right: cur.x + no.offsetWidth, bottom: cur.y + no.offsetHeight };
    } else {
      rect = no.getBoundingClientRect();
    }
    if (distToRect(pointer, rect) < NEAR) flee('mouse');
  }, { passive: true });

  document.addEventListener('pointerleave', function () { pointer = null; });

  no.addEventListener('pointerover', function (e) { if (e.pointerType === 'mouse') flee('mouse'); });
  no.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') { e.preventDefault(); flee('mouse'); }
  });
  no.addEventListener('touchstart', function (e) {
    e.preventDefault();
    flee('touch');
  }, { passive: false });
  no.addEventListener('touchend', function (e) { e.preventDefault(); }, { passive: false });
  no.addEventListener('click', function (e) { e.preventDefault(); flee('touch'); });
  function onResize() {
    if (!escaped || done) return;
    var v = viewport();
    var bw = no.offsetWidth, bh = no.offsetHeight;
    var p = {
      x: clamp(cur.x, M, Math.max(M, v.w - bw - M)),
      y: clamp(cur.y, M, Math.max(M, v.h - bh - M))
    };
    var yr = grow(yes.getBoundingClientRect(), 10);
    var r = { left: p.x, top: p.y, right: p.x + bw, bottom: p.y + bh };
    if (overlapArea(r, yr) > 0) p = pickPosition();
    no.style.transition = 'none';
    no.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
    void no.offsetWidth;
    no.style.transition = '';
    cur = p;
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 250); });
  function burst(x, y) {
    if (reduceMotion || !Element.prototype.animate) return;
    for (var i = 0; i < 28; i++) {
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      el.setAttribute('viewBox', '0 0 24 24');
      el.setAttribute('class', 'burst');
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.color = HEART_COLORS[i % HEART_COLORS.length];
      el.innerHTML = '<use href="#h"/>';
      document.body.appendChild(el);
      var ang = rand(0, Math.PI * 2), dist = rand(70, 220);
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 40;
      var anim = el.animate([
        { transform: 'translate(-50%,-50%) scale(0.3) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(' + rand(0.8, 1.8).toFixed(2) + ') rotate(' + rand(-60, 60).toFixed(0) + 'deg)', opacity: 0 }
      ], { duration: rand(800, 1500), easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });
      anim.onfinish = (function (n) { return function () { n.remove(); }; })(el);
    }
  }

  function celebrate() {
    if (done) return;
    done = true;
    no.hidden = true;   // NO keeps escaping right up to this moment, then leaves with the rest

    var r = yes.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
    if (yes.animate && !reduceMotion) {
      yes.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(0.9)' }], { duration: 240, easing: 'ease-out' });
    }

    setTimeout(function () {
      actions.hidden = true;
      lead.hidden = true;
      heading.textContent = 'I knew it, Omnia! ';
      heading.classList.add('swap');
      success.hidden = false;
      card.classList.add('celebrate');
    }, reduceMotion ? 0 : 240);
  }
  yes.addEventListener('click', celebrate);

  /* ---------- Rebuild the heart field on a big width change ---------- */
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - lastW) > 200) { lastW = window.innerWidth; buildHearts(); }
  });
})();