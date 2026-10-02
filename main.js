/* Guardian Group — motion layer.
 * GSAP + ScrollTrigger for choreography, Lenis as the only smooth-scroll engine,
 * Three.js for one job: the hero's "record field" — hairline rows of a transcript,
 * restless until the scroll reads them into order.
 * The page is complete without any of it (static first frame, reduced motion, no WebGL).
 *
 * Sequence: veil (once per session) → hero intro → scroll choreography → plates track.
 * Leaving: a graphite curtain carries the destination's name, then navigates.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = root.classList.contains('reduced');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var cleanups = [];
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  navMorph();

  if (reduced || !root.classList.contains('motion') || !window.gsap || !window.ScrollTrigger) {
    root.classList.remove('motion');
    root.classList.remove('veiled');
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll (Lenis) wired to ScrollTrigger ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.055, wheelMultiplier: 0.9, smoothWheel: true, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    var tick = function (time) { lenis.raf(time * 1000); };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    cleanups.push(function () { gsap.ticker.remove(tick); lenis.destroy(); });
  }

  /* ---------- Split headings into words (accessible name kept unsplit) ---------- */
  $$('[data-split]').forEach(splitWords);

  // First frames for everything that animates, then release the CSS hold
  gsap.set('.hero__title .wi', { yPercent: 112 });
  gsap.set('.hero__lede', { y: 18, opacity: 0 });
  gsap.set('.nav__inner', { yPercent: -40, opacity: 0 });
  gsap.set('.hero__field', { opacity: 0 });
  gsap.set('[data-cue]', { scaleY: 0 });
  root.classList.add('motion-ready');

  var field = null;
  var veiled = root.classList.contains('veiled');

  var lead = veiled ? veil() : 0;   // seconds before the hero may begin
  intro(lead);
  progress();
  heroScroll();
  pointer();
  epigraph();
  plates();
  summit();
  rises();
  magnets();
  leaveTransitions();

  // Measurements depend on web fonts and images
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });

  window.addEventListener('pagehide', function () {
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
    if (field) field.dispose();
  }, { once: true });

  /* ---------- Opening veil: star, seam, the plates part ---------- */
  function veil() {
    var el = $('[data-veil]');
    if (!el) return 0;
    if (lenis) lenis.stop();
    var tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete: function () {
        el.style.display = 'none';
        root.classList.remove('veiled');
        if (lenis) lenis.start();
        try { sessionStorage.setItem('gg-seen', '1'); } catch (e) {}
      }
    });
    tl.to('[data-veil-star]', { scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 0.1)
      .to('[data-veil-seam]', { scaleX: 1, duration: 0.8 }, 0.35)
      .to('[data-veil-star]', { rotation: 90, duration: 0.8, ease: 'power3.inOut' }, 0.5)
      .to(['[data-veil-star]', '[data-veil-seam]'], { opacity: 0, duration: 0.25, ease: 'power1.in' }, 1.05)
      .to('[data-veil-top]', { scaleY: 0, duration: 0.9, ease: 'expo.inOut' }, 1.15)
      .to('[data-veil-bot]', { scaleY: 0, duration: 0.9, ease: 'expo.inOut' }, 1.15);
    return 1.3;
  }

  /* ---------- Hero intro ---------- */
  function intro(delay) {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: delay });
    tl.to('.nav__inner', { yPercent: 0, opacity: 1, duration: 0.9, clearProps: 'transform,opacity' }, 0)
      .to('.hero__title .wi', { yPercent: 0, duration: 1.15, stagger: 0.045 }, 0.12)
      .to('.hero__lede', { y: 0, opacity: 1, duration: 1 }, 0.6)
      .to('[data-cue]', { scaleY: 1, duration: 0.9 }, 0.9);

    // The field: WebGL if it arrives in time, otherwise the CSS first frame
    var veilClear = false, glAnswered = false, api = null, settled = false;
    gsap.delayedCall(delay + 0.05, function () { veilClear = true; settle(); });
    var timeout = setTimeout(function () { glAnswered = true; settle(); }, 1400 + delay * 1000);
    initField($('[data-field]'), $('[data-field-host]')).then(function (a) { api = a; glAnswered = true; clearTimeout(timeout); settle(); });

    function settle() {
      if (settled) {
        if (api && !field) { field = api; root.classList.add('has-gl'); api.start(); }
        return;
      }
      if (!veilClear || !glAnswered) return;
      settled = true;
      if (api) { field = api; root.classList.add('has-gl'); api.start(); }
      gsap.to('.hero__field', { opacity: 1, duration: 1.8, ease: 'power2.out' });
    }
  }

  /* ---------- Scroll progress hairline in the floating nav ---------- */
  function progress() {
    gsap.to('[data-progress]', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
    });
  }

  /* ---------- Hero on scroll: the copy lifts, the field settles into order ---------- */
  function heroScroll() {
    gsap.to('.hero__copy', {
      y: -70, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('[data-cue]', {
      scaleY: 0, ease: 'none', transformOrigin: '50% 100%',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '40% top', scrub: true }
    });
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: function (self) { if (field) field.setOrder(self.progress); }
    });
  }

  /* ---------- Pointer → field light (fine pointers only; resets on leave/blur) ---------- */
  function pointer() {
    if (!finePointer) return;
    var onMove = function (e) { if (field) field.pointer(e.clientX, e.clientY); };
    var reset = function () { if (field) field.release(); };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', function () { if (document.hidden) reset(); });
    cleanups.push(function () {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
    });
  }

  /* ---------- Magnetic CTAs (fine pointers only; small, bounded, resets) ---------- */
  function magnets() {
    if (!finePointer) return;
    $$('[data-magnet]').forEach(function (el) {
      var x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      var y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      var move = function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        x(Math.max(-8, Math.min(8, dx * 0.22)));
        y(Math.max(-6, Math.min(6, dy * 0.22)));
      };
      var leave = function () { x(0); y(0); };
      el.addEventListener('pointermove', move, { passive: true });
      el.addEventListener('pointerleave', leave);
      window.addEventListener('blur', leave);
      cleanups.push(function () { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); window.removeEventListener('blur', leave); });
    });
  }

  /* ---------- Page-leave curtain on outbound links ---------- */
  function leaveTransitions() {
    var curtain = $('[data-curtain]');
    var label = $('[data-curtain-label]');
    if (!curtain || !label) return;
    var leaving = false;
    gsap.set(label, { y: 12 });
    var reset = function () {
      leaving = false;
      gsap.set(curtain, { scaleY: 0, pointerEvents: 'none' });
      gsap.set(label, { opacity: 0, y: 12 });
    };
    $$('a[href^="http"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (leaving) { e.preventDefault(); return; }
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || a.target === '_blank') return;
        e.preventDefault();
        leaving = true;
        label.textContent = a.getAttribute('data-name') || '';
        if (lenis) lenis.stop();
        gsap.timeline({ onComplete: function () { window.location.href = a.href; } })
          .set(curtain, { pointerEvents: 'auto' })
          .to(curtain, { scaleY: 1, duration: 0.65, ease: 'expo.inOut' }, 0)
          .to(label, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.4)
          .to({}, { duration: 0.25 });
      });
    });
    // Coming back via the back button restores a clean page
    window.addEventListener('pageshow', function (e) { if (e.persisted) { reset(); if (lenis) lenis.start(); } });
  }

  /* ---------- Epigraph: the band closes in, the line lights word by word ---------- */
  function epigraph() {
    var words = $$('.epigraph__quote .wi');
    gsap.fromTo('[data-ground]', { scaleX: 0.93, scaleY: 0.9 }, {
      scaleX: 1, scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '[data-epigraph]', start: 'top bottom', end: 'top 15%', scrub: true }
    });

    var mm = gsap.matchMedia();
    var build = function (pin) {
      var tl = gsap.timeline({
        scrollTrigger: pin
          ? { trigger: '[data-epigraph]', start: 'top top', end: '+=120%', scrub: 0.6, pin: true, anticipatePin: 1 }
          : { trigger: '[data-epigraph]', start: 'top 70%', end: 'bottom 70%', scrub: 0.6 }
      });
      tl.fromTo('[data-star]', { rotation: -90, scale: 0.4, opacity: 0, transformOrigin: '50% 50%' }, { rotation: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
        .fromTo(words, { opacity: 0.14 }, { opacity: 1, duration: 0.3, stagger: 0.22, ease: 'none' }, 0.15)
        .fromTo('[data-cite]', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '>-0.05')
        .fromTo('[data-epirule]', { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.inOut' }, '<')
        .to({}, { duration: 0.3 });
      return function () { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); };
    };
    mm.add('(min-width: 861px) and (min-height: 560px)', function () { return build(true); });
    mm.add('(max-width: 860px), (max-height: 559px)', function () { return build(false); });
  }

  /* ---------- The three: a pinned horizontal track on wide screens ---------- */
  function plates() {
    var pin = $('[data-pin]');
    var track = $('[data-track]');
    var items = $$('[data-plate]');
    var inners = $$('[data-plate-inner]');
    var measures = $$('[data-measure]');
    var labels = $$('[data-rail]');
    var marker = $('[data-marker]');
    if (!pin || !track || !items.length) return;

    gsap.fromTo('.plates__title .wi', { yPercent: 112 }, {
      yPercent: 0, duration: 1.1, stagger: 0.05, ease: 'expo.out',
      scrollTrigger: { trigger: '.plates__title', start: 'top 85%', once: true }
    });

    var mm = gsap.matchMedia();

    mm.add('(min-width: 861px)', function () {
      var n = items.length;
      var dist = function () { return track.scrollWidth - window.innerWidth; };
      var current = -1;
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pin, start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: function (self) {
            var idx = Math.round(self.progress * (n - 1));
            if (idx !== current) {
              current = idx;
              labels.forEach(function (l, i) { l.classList.toggle('is-current', i === idx); });
              pin.classList.toggle('is-night', items[idx].classList.contains('plate--night'));
            }
          }
        }
      });
      tl.to(track, { x: function () { return -dist(); }, duration: 1 }, 0);
      // each plate's content arrives a little ahead of its plate and leaves a little behind
      inners.forEach(function (el, i) { tl.fromTo(el, { x: 110 * i }, { x: -110 * (n - 1 - i), duration: 1 }, 0); });
      if (marker) tl.to(marker, { xPercent: 100 * (n - 1), duration: 1 }, 0);
      // the measure draws as its plate arrives
      measures.forEach(function (el, i) {
        var at = Math.max(0, i / (n - 1) - 0.14);
        tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: 'power2.out' }, at);
      });
      return function () {
        tl.scrollTrigger && tl.scrollTrigger.kill();
        tl.kill();
        gsap.set([track].concat(inners, measures, marker || []), { clearProps: 'all' });
      };
    });

    mm.add('(max-width: 860px)', function () {
      var tweens = measures.map(function (el) {
        return gsap.fromTo(el, { scaleX: 0 }, {
          scaleX: 1, duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: el.closest('[data-plate]'), start: 'top 60%', once: true }
        });
      });
      return function () { tweens.forEach(function (t) { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); }); gsap.set(measures, { clearProps: 'all' }); };
    });
  }

  /* ---------- The pyramid: built from the foundation up, then lit tier by tier ---------- */
  function summit() {
    var section = $('[data-summit]');
    var pin = $('[data-summit-pin]');
    var tiers = $$('.pyr__tier');
    if (!section || !pin || !tiers.length) return;
    gsap.set(tiers, { y: 46, opacity: 0 });
    gsap.set('.summit__label', { x: 18 });

    var build = function (tl) {
      tl.to(tiers, { y: 0, opacity: 1, duration: 0.5, stagger: { each: 0.16, from: 'end' }, ease: 'power2.out' }, 0);
      // light from the base up: Merlin (3), then Advisory (2), then Civil (1)
      [3, 2, 1].forEach(function (n, k) {
        var at = 0.95 + k * 0.6;
        tl.to('[data-lit="' + n + '"]', { opacity: 1, duration: 0.35, ease: 'power2.out' }, at)
          .to('[data-lead="' + n + '"]', { strokeDashoffset: 0, duration: 0.3, ease: 'power2.out' }, at + 0.08)
          .to('[data-dot="' + n + '"]', { opacity: 1, duration: 0.15, ease: 'power2.out' }, at + 0.34)
          .to('[data-label="' + n + '"]', { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, at + 0.2);
      });
      tl.to({}, { duration: 0.5 });
      return tl;
    };

    var mm = gsap.matchMedia();
    mm.add('(min-width: 861px) and (min-height: 600px)', function () {
      var tl = build(gsap.timeline({
        scrollTrigger: { trigger: pin, start: 'top top', end: '+=170%', pin: true, scrub: 0.7, anticipatePin: 1 }
      }));
      return function () { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); };
    });
    mm.add('(max-width: 860px), (max-height: 599px)', function () {
      var tl = build(gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top 80%', end: 'bottom 70%', scrub: 0.7 }
      }));
      return function () { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); };
    });
  }

  /* ---------- Supporting copy rises in as it arrives ---------- */
  function rises() {
    var els = $$('[data-rise]').filter(function (el) { return !el.closest('.hero'); });
    gsap.set(els, { y: 24, opacity: 0 });
    ScrollTrigger.batch(els, {
      start: 'top 90%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: 'expo.out', overwrite: true });
      }
    });
  }

  /* ---------- helpers ---------- */
  function splitWords(el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    var vis = document.createElement('span');
    vis.className = 'split';
    vis.setAttribute('aria-hidden', 'true');
    var words = text.split(' ');
    words.forEach(function (word, i) {
      var w = document.createElement('span'); w.className = 'w';
      var wi = document.createElement('span'); wi.className = 'wi';
      wi.textContent = word;
      w.appendChild(wi); vis.appendChild(w);
      if (i < words.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    el.textContent = '';
    el.appendChild(sr);
    el.appendChild(vis);
  }

  // Resolve a CSS colour token to RGB (0–1) via a 2D canvas — keeps the shader on the token palette
  function tokenRGB(name) {
    var c = document.createElement('canvas'); c.width = c.height = 1;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = getComputedStyle(root).getPropertyValue(name).trim() || '#000';
    ctx.fillRect(0, 0, 1, 1);
    var d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  /* ======================================================================
   * WebGL · the record field. A full-bleed quad; everything is drawn in the
   * fragment shader: rows of a transcript, warped by slow noise and by the
   * pointer, read into straight order as the hero scrolls away. A bronze
   * reading line follows the pointer; a slower one sweeps on its own.
   * ====================================================================== */
  function initField(canvas, host) {
    if (!canvas || !host) return Promise.resolve(null);
    try {
      var probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return Promise.resolve(null);
    } catch (e) { return Promise.resolve(null); }

    return import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js')
      .then(function (THREE) { return buildField(THREE, canvas, host); })
      .catch(function () { return null; });
  }

  function buildField(THREE, canvas, host) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

    var paper = tokenRGB('--color-paper'), ink = tokenRGB('--color-ink'), bronze = tokenRGB('--color-accent');
    var uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.72, 0.62) },
      uPointerOn: { value: 0 },
      uOrder: { value: 0 },
      uPaper: { value: new THREE.Vector3(paper[0], paper[1], paper[2]) },
      uInk: { value: new THREE.Vector3(ink[0], ink[1], ink[2]) },
      uBronze: { value: new THREE.Vector3(bronze[0], bronze[1], bronze[2]) }
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      depthTest: false,
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'precision highp float;',
        'uniform vec2 uRes, uPointer;',
        'uniform float uTime, uPointerOn, uOrder;',
        'uniform vec3 uPaper, uInk, uBronze;',
        'float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
        'float vnoise(vec2 p){',
        '  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
        '  float a = h21(i), b = h21(i + vec2(1.0, 0.0)), c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));',
        '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
        '}',
        'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; } return v; }',
        'void main(){',
        '  vec2 uv = gl_FragCoord.xy / uRes;',
        '  float aspect = uRes.x / uRes.y;',
        '  vec2 p = vec2(uv.x * aspect, uv.y);',
        '  float t = uTime * 0.045;',
        '  float disorder = 1.0 - uOrder * 0.92;',
        // slow domain warp: the record before it has been read
        '  vec2 warp = vec2(fbm(p * 1.3 + vec2(t, -t * 0.7)), fbm(p * 1.3 + vec2(-t * 0.6, t) + 31.7)) - 0.5;',
        // the rows divert around the pointer like a current around a stone:
        // above it they lift, below it they dip, falling off over a wide ellipse
        '  vec2 pp = vec2(uPointer.x * aspect, uPointer.y);',
        '  vec2 dp = p - pp;',
        '  float lens = exp(-(dp.x * dp.x * 13.0 + dp.y * dp.y * 52.0)) * uPointerOn;',
        '  float side = dp.y / (abs(dp.y) + 0.025);',
        '  float divert = side * lens * 0.09;',
        '  vec2 q = p + warp * 0.16 * disorder;',
        '  q.y -= divert;',   // sample toward the pointer: the row under it stretches across, its neighbours bow away
        // rows, ~11 px apart, one hairline each
        '  float cell = 11.0;',
        '  float rows = uRes.y / cell;',
        '  float rowY = q.y * rows;',
        '  float row = floor(rowY);',
        '  float fy = fract(rowY);',
        '  float lw = 1.1 / cell * (1.0 - 0.6 * lens);',   // the stretched row stays a hairline
        '  float line = 1.0 - smoothstep(lw * 0.5, lw * 1.5, abs(fy - 0.5));',
        // broken into text-like runs with a ragged right margin
        '  float sx = q.x * 9.0;',
        '  float seg = h21(vec2(row, floor(sx + h21(vec2(row, 7.0)) * 3.0)));',
        '  float on = step(0.3, seg);',
        '  float ragged = 0.55 + h21(vec2(row, 3.0)) * 0.45;',
        '  float inside = step(0.0, q.x) * step(q.x, ragged * aspect);',
        '  float ink = line * on * inside;',
        // reading lines: one on the pointer, one slow sweep
        '  float band = exp(-pow((q.y - uPointer.y) * 11.0, 2.0)) * uPointerOn;',
        '  float sweep = exp(-pow((q.y - (0.5 + 0.42 * sin(uTime * 0.12))) * 10.0, 2.0)) * 0.6;',
        '  float glow = clamp(band + sweep, 0.0, 1.0);',
        // keep the copy legible: the field lives top and right
        '  float m = max(smoothstep(0.46, 0.82, uv.x), smoothstep(0.5, 0.86, uv.y));',
        '  if (aspect < 1.0) m = smoothstep(0.44, 0.76, uv.y);',   // phones: the copy spans the width, so the field keeps to the top
        '  m = max(m, 0.05);',
        '  float strength = (0.22 + 0.16 * disorder) * m;',
        '  vec3 inkCol = mix(uInk, uBronze, glow);',
        '  vec3 col = mix(uPaper, inkCol, ink * strength * (0.75 + 0.6 * glow));',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });

    var geometry = new THREE.PlaneGeometry(2, 2);
    var scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var REST = { x: 0.72, y: 0.62 };
    var target = { x: REST.x, y: REST.y, on: 0 };
    var running = false, visible = true, raf = 0, lost = false, frameNo = 0;
    var t0 = performance.now();

    function size() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      var s = new THREE.Vector2();
      renderer.getDrawingBufferSize(s);
      uniforms.uRes.value.set(s.x, s.y);
      wake();
    }
    var ro = new ResizeObserver(size);
    ro.observe(host);
    size();

    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) wake(); else stop();
    });
    io.observe(host);

    function frame(now) {
      raf = 0;
      if (!running || lost || !visible || document.hidden) return;
      var P = uniforms.uPointer.value;
      P.x += (target.x - P.x) * 0.14;
      P.y += (target.y - P.y) * 0.14;
      uniforms.uPointerOn.value += (target.on - uniforms.uPointerOn.value) * 0.08;
      uniforms.uTime.value = (now - t0) * 0.001;
      if ((frameNo++ & 1) === 0) renderer.render(scene, camera);   // 30 fps is plenty for a drifting field
      raf = requestAnimationFrame(frame);
    }
    function wake() {
      if (lost || !visible || document.hidden) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    var onVis = function () { if (document.hidden) stop(); else wake(); };
    document.addEventListener('visibilitychange', onVis);
    var onLost = function (e) { e.preventDefault(); lost = true; stop(); root.classList.remove('has-gl'); };
    var onRestored = function () { lost = false; root.classList.add('has-gl'); wake(); };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    var pending = null;
    return {
      start: wake,
      setOrder: function (v) { uniforms.uOrder.value = v; wake(); },
      pointer: function (cx, cy) {
        if (pending) { pending.x = cx; pending.y = cy; return; }   // one read per frame
        pending = { x: cx, y: cy };
        requestAnimationFrame(function () {
          var r = host.getBoundingClientRect();
          if (r.width && r.height) {
            target.x = (pending.x - r.left) / r.width;
            target.y = 1 - (pending.y - r.top) / r.height;
            target.on = (target.y >= -0.1 && target.y <= 1.1) ? 1 : 0;
          }
          pending = null;
          wake();
        });
      },
      release: function () { target.on = 0; target.x = REST.x; target.y = REST.y; wake(); },
      dispose: function () {
        stop();
        ro.disconnect(); io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
        geometry.dispose(); material.dispose(); renderer.dispose();
      }
    };
  }

  /* ======================================================================
   * Runs with or without motion
   * ====================================================================== */
  function navMorph() {
    var nav = $('[data-nav]');
    if (!nav) return;
    var floating = false, ticking = false;
    var update = function () {
      var next = window.scrollY > 80;
      if (next !== floating) { floating = next; nav.classList.toggle('is-floating', floating); }
    };
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    update();
  }
})();
